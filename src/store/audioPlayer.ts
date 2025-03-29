/**
 * HTMLAudioElement周りの音声再生・停止などを担当する。
 */
import { createPartialStore } from "./vuex";
import { AudioPlayerStoreState, AudioPlayerStoreTypes } from "./type";
import { AudioKey } from "@/type/preload";
import { showAlertDialog } from "@/components/Dialog/Dialog";
import { buffer } from "node:stream/consumers";
import { audio } from "systeminformation";

// Wav音声データをデコードして波形データに変換する
const createWavDecoder = () => {
  let remainBuffer: Uint8Array;
  let remainBytes: number;
  let skipBytes: number;

  return new TransformStream<Uint8Array, Float32Array>({
    start() {
      remainBuffer = new Uint8Array(1);
      remainBytes = 0;
      skipBytes = 44;
    },
    transform(value, controller) {
        let recvBytes = value.length;
        if (skipBytes > 0) {
          if (recvBytes > skipBytes) {
            value = value.subarray(skipBytes);
            recvBytes -= skipBytes;
            skipBytes = 0;
          }
          else {
            skipBytes -= recvBytes;
            return;
          }
        }
        const bufferedBytes = remainBytes + recvBytes;
        const buffered = new Uint8Array(bufferedBytes);
        buffered.set(remainBuffer.subarray(0, remainBytes));
        buffered.set(value, remainBytes);
        const bufferedView = new DataView(buffered.buffer);
        const numFrames = Math.floor(bufferedBytes / 2);
        const audioData = new Float32Array(numFrames);
        for (let i = 0; i < numFrames; i++) {
          const sample = bufferedView.getInt16(i * 2, true);
          audioData[i] = sample / 32768;
        }
        remainBytes = bufferedBytes % 2;
        if (remainBytes === 1) {
          remainBuffer[0] = buffered[bufferedBytes - 1];
        }
        controller.enqueue(audioData);
    },
  });
};

// 指定したフレーム数だけスキップしてからストリームを通過させる
const createSkipStream = (skipFramesConfig: number) => {
  let skipFrames: number;

  return new TransformStream<Float32Array, Float32Array>({
    start() {
      skipFrames = skipFramesConfig;
    },
    transform(value, controller) {
      const numFrames = value.length;
      if (skipFrames === 0) {
        controller.enqueue(value);
      }
      else if (numFrames > skipFrames) {
        controller.enqueue(value.subarray(skipFrames));
        skipFrames = 0;
      }
      else {
        skipFrames -= numFrames;
      }
    },
  });
};

// 指定したフレーム数だけためてからストリームを通過させる
const createBufferStream = (bufferFramesConfig: number) => {
  let bufferFrames: number;
  let buffer: Float32Array;
  let bufferPtr: number;

  return new TransformStream<Float32Array, Float32Array>({
    start() {
      bufferFrames = bufferFramesConfig;
      buffer = new Float32Array(bufferFrames);
      bufferPtr = 0;
    },
    transform(value, controller) {
      const numFrames = value.length;
      if (bufferPtr < bufferFrames) {
        if (bufferPtr + numFrames < bufferFrames) {
          // buffering
          buffer.set(value, bufferPtr);
          bufferPtr += numFrames;
        }
        else {
          // concat and flush
          const newBuffer = new Float32Array(bufferPtr + numFrames);
          newBuffer.set(buffer.subarray(0, bufferPtr));
          newBuffer.set(value, bufferPtr);
          bufferPtr = bufferFrames;
          controller.enqueue(newBuffer);
        }
      } else {
        // flush
        controller.enqueue(value);
      }
    },
    flush(controller) {
      if (bufferPtr < bufferFrames) {
        // flush remaining buffer
        controller.enqueue(buffer.subarray(0, bufferPtr));
      }
    },
  });
};

// ユニットテストが落ちるのを回避するための遅延読み込み
const getAudioElement = (() => {
  let audioElement: HTMLAudioElement | undefined = undefined;
  return () => {
    if (audioElement == undefined) {
      audioElement = new Audio();
    }
    return audioElement;
  };
})();

const getAudioContext = (() => {
  let audioContext: AudioContext | undefined = undefined;
  return () => {
    if (audioContext == undefined || audioContext.state === "closed") {
      audioContext = new AudioContext();
    }
    return audioContext;
  };
})();

export const audioPlayerStoreState: AudioPlayerStoreState = {
  nowPlayingAudioKey: undefined,
};

export const audioPlayerStore = createPartialStore<AudioPlayerStoreTypes>({
  ACTIVE_AUDIO_ELEM_CURRENT_TIME: {
    getter: (state) => {
      return state._activeAudioKey != undefined
        ? getAudioElement().currentTime
        : undefined;
    },
  },

  NOW_PLAYING: {
    getter(state, getters) {
      const activeAudioKey = getters.ACTIVE_AUDIO_KEY;
      return (
        activeAudioKey != undefined &&
        activeAudioKey === state.nowPlayingAudioKey
      );
    },
  },

  SET_AUDIO_NOW_PLAYING: {
    mutation(
      state,
      { audioKey, nowPlaying }: { audioKey: AudioKey; nowPlaying: boolean },
    ) {
      state.nowPlayingAudioKey = nowPlaying ? audioKey : undefined;
    },
  },

  SET_AUDIO_SOURCE: {
    mutation(_, { audioBlob }: { audioBlob: Blob }) {
      getAudioElement().src = URL.createObjectURL(audioBlob);
    },
  },

  PLAY_AUDIO_PLAYER: {
    async action(
      { state, mutations },
      { offset, audioKey }: { offset?: number; audioKey?: AudioKey },
    ) {
      const audioElement = getAudioElement();

      if (offset != undefined) {
        audioElement.currentTime = offset;
      }

      // 一部ブラウザではsetSinkIdが実装されていないので、その環境では無視する
      if (audioElement.setSinkId) {
        audioElement
          .setSinkId(state.savingSetting.audioOutputDevice)
          .catch((err: unknown) => {
            const stop = () => {
              audioElement.pause();
              audioElement.removeEventListener("canplay", stop);
            };
            audioElement.addEventListener("canplay", stop);
            void showAlertDialog({
              title: "エラー",
              message: "再生デバイスが見つかりません",
            });
            throw err;
          });
      }

      // 再生終了時にresolveされるPromiseを返す
      const played = async () => {
        if (audioKey) {
          mutations.SET_AUDIO_NOW_PLAYING({ audioKey, nowPlaying: true });
        }
      };
      audioElement.addEventListener("play", played);

      let paused: () => void;
      const audioPlayPromise = new Promise<boolean>((resolve) => {
        paused = () => {
          resolve(audioElement.ended);
        };
        audioElement.addEventListener("pause", paused);
      }).finally(async () => {
        audioElement.removeEventListener("play", played);
        audioElement.removeEventListener("pause", paused);
        if (audioKey) {
          mutations.SET_AUDIO_NOW_PLAYING({ audioKey, nowPlaying: false });
        }
      });

      void audioElement.play();

      return audioPlayPromise;
    },
  },

  STREAM_AUDIO_PLAYER: {
    async action(
      { state, mutations },
      { offset, buffer, audioStream, audioKey }: { offset?: number; buffer?: number; audioStream: ReadableStream<Uint8Array>; audioKey?: AudioKey },
    ) {
      const audioContext = getAudioContext();
      let stream = audioStream.pipeThrough(createWavDecoder());
      if (offset != undefined) {
        stream = stream.pipeThrough(createSkipStream(Math.floor(offset * 24000)));
      }
      if (buffer != undefined) {
        stream = stream.pipeThrough(createBufferStream(buffer * 24000));
      }

      // 一部ブラウザではsetSinkIdが実装されていないので、その環境では無視する
      if (audioContext.setSinkId) {
        audioContext
          .setSinkId(state.savingSetting.audioOutputDevice)
          .catch((err: unknown) => {
            void showAlertDialog({
              title: "エラー",
              message: "再生デバイスが見つかりません",
            });
            throw err;
          });
      }

      const reader = stream.getReader();
      if (audioKey) {
        mutations.SET_AUDIO_NOW_PLAYING({ audioKey, nowPlaying: true });
      }
      let lastBufferedTime = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done || audioContext.state === "closed") {
          if (audioKey) {
            mutations.SET_AUDIO_NOW_PLAYING({ audioKey, nowPlaying: false });
          }
          break;
        }
        const numFrames = value.length;
        const source = audioContext.createBufferSource();
        source.buffer = audioContext.createBuffer(1, numFrames, 24000);
        source.buffer.copyToChannel(value, 0);
        source.connect(audioContext.destination);
        source.start(lastBufferedTime);
        lastBufferedTime = Math.max(lastBufferedTime, audioContext.currentTime) + numFrames / 24000;
      }
      // FIXME: ユーザーに止められたときはfalseを返すべき
      return true;
    },
  },

  STOP_AUDIO: {
    // 停止中でも呼び出して問題ない
    action() {
      // PLAY_ でonpause時の処理が設定されているため、pauseするだけで良い
      getAudioElement().pause();
    },
  },

  STOP_STREAM: {
    action() {
      getAudioContext().close();
    },
  },
});
