<template>
  <div class="root full-height q-py-md" v-show="activeAudioKey" v-if="query">
    <div class="q-px-md">
      <span class="text-body1 q-mb-xs"
        >話速 {{ previewAudioSpeedScale.currentValue.value.toFixed(1) }}</span
      >
      <q-slider
        dense
        snap
        :min="0.5"
        :max="2"
        :step="0.1"
        :disable="uiLocked"
        :model-value="previewAudioSpeedScale.currentValue.value"
        @update:model-value="setPreviewValue(previewAudioSpeedScale, $event)"
        @change="setAudioSpeedScale"
        @wheel="uiLocked || setAudioInfoByScroll(query, $event.deltaY, 'speed')"
        @pan="setPanning(previewAudioSpeedScale, $event)"
      />
    </div>
    <div class="q-px-md">
      <span class="text-body1 q-mb-xs"
        >音高 {{ previewAudioPitchScale.currentValue.value.toFixed(2) }}</span
      >
      <q-slider
        dense
        snap
        :min="-0.15"
        :max="0.15"
        :step="0.01"
        :disable="uiLocked"
        :model-value="previewAudioPitchScale.currentValue.value"
        @update:model-value="setPreviewValue(previewAudioPitchScale, $event)"
        @change="setAudioPitchScale"
        @wheel="uiLocked || setAudioInfoByScroll(query, $event.deltaY, 'pitch')"
        @pan="setPanning(previewAudioPitchScale, $event)"
      />
    </div>
    <div class="q-px-md">
      <span class="text-body1 q-mb-xs"
        >抑揚
        {{ previewAudioIntonationScale.currentValue.value.toFixed(1) }}</span
      >
      <q-slider
        dense
        snap
        :min="0"
        :max="2"
        :step="0.01"
        :disable="uiLocked"
        :model-value="previewAudioIntonationScale.currentValue.value"
        @update:model-value="
          setPreviewValue(previewAudioIntonationScale, $event)
        "
        @change="setAudioIntonationScale"
        @wheel="uiLocked || setAudioInfoByScroll(query, $event.deltaY, 'into')"
        @pan="setPanning(previewAudioIntonationScale, $event)"
      />
    </div>
    <div class="q-px-md">
      <span class="text-body1 q-mb-xs"
        >音量 {{ previewAudioVolumeScale.currentValue.value.toFixed(1) }}</span
      >
      <q-slider
        dense
        snap
        :min="0"
        :max="2"
        :step="0.1"
        :disable="uiLocked"
        :model-value="previewAudioVolumeScale.currentValue.value"
        @update:model-value="setPreviewValue(previewAudioVolumeScale, $event)"
        @change="setAudioVolumeScale"
        @wheel="
          uiLocked || setAudioInfoByScroll(query, $event.deltaY, 'volume')
        "
        @pan="setPanning(previewAudioVolumeScale, $event)"
      />
    </div>
    <div class="q-px-md">
      <span class="text-body1 q-mb-xs"
        >開始無音
        {{ previewAudioPrePhonemeLength.currentValue.value.toFixed(2) }}</span
      >
      <q-slider
        dense
        snap
        :min="0"
        :max="1.5"
        :step="0.1"
        :disable="uiLocked"
        :model-value="previewAudioPrePhonemeLength.currentValue.value"
        @update:model-value="
          setPreviewValue(previewAudioPrePhonemeLength, $event)
        "
        @change="setAudioPrePhonemeLength"
        @wheel="
          uiLocked || setAudioInfoByScroll(query, $event.deltaY, 'prePhoneme')
        "
        @pan="setPanning(previewAudioPrePhonemeLength, $event)"
      />
    </div>
    <div class="q-px-md">
      <span class="text-body1 q-mb-xs"
        >終了無音
        {{ previewAudioPostPhonemeLength.currentValue.value.toFixed(2) }}</span
      >
      <q-slider
        dense
        snap
        :min="0"
        :max="1.5"
        :step="0.1"
        :disable="uiLocked"
        :model-value="previewAudioPostPhonemeLength.currentValue.value"
        @update:model-value="
          setPreviewValue(previewAudioPostPhonemeLength, $event)
        "
        @change="setAudioPostPhonemeLength"
        @wheel="
          uiLocked || setAudioInfoByScroll(query, $event.deltaY, 'postPhoneme')
        "
        @pan="setPanning(previewAudioPostPhonemeLength, $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useStore } from "@/store";
import { AudioQuery } from "@/openapi";
import { PreviewableValue } from "@/helpers/previewableValue";

export default defineComponent({
  name: "AudioInfo",

  setup() {
    const store = useStore();

    // accent phrase
    const activeAudioKey = computed<string | undefined>(
      () => store.getters.ACTIVE_AUDIO_KEY
    );
    const uiLocked = computed(() => store.getters.UI_LOCKED);

    const audioItem = computed(() =>
      activeAudioKey.value ? store.state.audioItems[activeAudioKey.value] : null
    );
    const query = computed(() => audioItem.value?.query);

    const previewAudioSpeedScale = new PreviewableValue(
      () => query.value?.speedScale
    );

    const previewAudioPitchScale = new PreviewableValue(
      () => query.value?.pitchScale
    );

    const previewAudioIntonationScale = new PreviewableValue(
      () => query.value?.intonationScale
    );

    const previewAudioVolumeScale = new PreviewableValue(
      () => query.value?.volumeScale
    );

    const previewAudioPrePhonemeLength = new PreviewableValue(
      () => query.value?.prePhonemeLength
    );

    const previewAudioPostPhonemeLength = new PreviewableValue(
      () => query.value?.postPhonemeLength
    );

    const setPreviewValue = (
      previewableValue: PreviewableValue,
      value: number
    ) => previewableValue.setPreviewValue(value);

    const setPanning = (
      previewableValue: PreviewableValue,
      panning: string
    ) => {
      if (panning === "start") {
        previewableValue.startPreview();
      } else {
        previewableValue.stopPreview();
      }
    };

    const setAudioSpeedScale = (speedScale: number) => {
      previewAudioSpeedScale.stopPreview();
      store.dispatch("COMMAND_SET_AUDIO_SPEED_SCALE", {
        audioKey: activeAudioKey.value!,
        speedScale,
      });
    };

    const setAudioPitchScale = (pitchScale: number) => {
      previewAudioPitchScale.stopPreview();
      store.dispatch("COMMAND_SET_AUDIO_PITCH_SCALE", {
        audioKey: activeAudioKey.value!,
        pitchScale,
      });
    };

    const setAudioIntonationScale = (intonationScale: number) => {
      previewAudioIntonationScale.stopPreview();
      store.dispatch("COMMAND_SET_AUDIO_INTONATION_SCALE", {
        audioKey: activeAudioKey.value!,
        intonationScale,
      });
    };

    const setAudioVolumeScale = (volumeScale: number) => {
      previewAudioVolumeScale.stopPreview();
      store.dispatch("COMMAND_SET_AUDIO_VOLUME_SCALE", {
        audioKey: activeAudioKey.value!,
        volumeScale,
      });
    };

    const setAudioPrePhonemeLength = (prePhonemeLength: number) => {
      previewAudioPrePhonemeLength.stopPreview();
      store.dispatch("COMMAND_SET_AUDIO_PRE_PHONEME_LENGTH", {
        audioKey: activeAudioKey.value!,
        prePhonemeLength,
      });
    };

    const setAudioPostPhonemeLength = (postPhonemeLength: number) => {
      previewAudioPostPhonemeLength.stopPreview();
      store.dispatch("COMMAND_SET_AUDIO_POST_PHONEME_LENGTH", {
        audioKey: activeAudioKey.value!,
        postPhonemeLength,
      });
    };

    type InfoType =
      | "speed"
      | "pitch"
      | "into"
      | "volume"
      | "prePhoneme"
      | "postPhoneme";

    const setAudioInfoByScroll = (
      query: AudioQuery,
      delta_y: number,
      type: InfoType
    ) => {
      switch (type) {
        case "speed": {
          let curSpeed = query.speedScale - (delta_y > 0 ? 0.1 : -0.1);
          curSpeed = Math.round(curSpeed * 1e2) / 1e2;
          if (2 >= curSpeed && curSpeed >= 0.5) {
            setAudioSpeedScale(curSpeed);
          }
          break;
        }
        case "pitch": {
          let curPitch = query.pitchScale - (delta_y > 0 ? 0.01 : -0.01);
          curPitch = Math.round(curPitch * 1e2) / 1e2;
          if (0.15 >= curPitch && curPitch >= -0.15) {
            setAudioPitchScale(curPitch);
          }
          break;
        }
        case "into": {
          let curInto = query.intonationScale - (delta_y > 0 ? 0.1 : -0.1);
          curInto = Math.round(curInto * 1e1) / 1e1;
          if (2 >= curInto && curInto >= 0) {
            setAudioIntonationScale(curInto);
          }
          break;
        }
        case "volume": {
          let curVolume = query.volumeScale - (delta_y > 0 ? 0.1 : -0.1);
          curVolume = Math.round(curVolume * 1e1) / 1e1;
          if (2 >= curVolume && curVolume >= 0) {
            setAudioVolumeScale(curVolume);
          }
          break;
        }
        case "prePhoneme": {
          let curPrePhoneme =
            query.prePhonemeLength - (delta_y > 0 ? 0.1 : -0.1);
          curPrePhoneme = Math.round(curPrePhoneme * 1e2) / 1e2;
          if (1.5 >= curPrePhoneme && curPrePhoneme >= 0) {
            setAudioPrePhonemeLength(curPrePhoneme);
          }
          break;
        }
        case "postPhoneme": {
          let curPostPhoneme =
            query.postPhonemeLength - (delta_y > 0 ? 0.1 : -0.1);
          curPostPhoneme = Math.round(curPostPhoneme * 1e2) / 1e2;
          if (1.5 >= curPostPhoneme && curPostPhoneme >= 0) {
            setAudioPostPhonemeLength(curPostPhoneme);
          }
          break;
        }
        default:
          break;
      }
    };

    return {
      activeAudioKey,
      uiLocked,
      audioItem,
      query,
      previewAudioSpeedScale,
      previewAudioPitchScale,
      previewAudioIntonationScale,
      previewAudioVolumeScale,
      previewAudioPrePhonemeLength,
      previewAudioPostPhonemeLength,
      setPreviewValue,
      setAudioSpeedScale,
      setAudioPitchScale,
      setAudioIntonationScale,
      setAudioVolumeScale,
      setAudioPrePhonemeLength,
      setAudioPostPhonemeLength,
      setAudioInfoByScroll,
      setPanning,
    };
  },
});
</script>

<style scoped lang="scss">
@use '@/styles' as global;

.root {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 15px 0;
  overflow-y: scroll;
}
</style>
