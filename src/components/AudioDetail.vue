<template>
  <div
    v-show="activeAudioKey"
    class="full-height root relarive-absolute-wrapper"
  >
    <div>
      <div class="side">
        <div class="detail-selector">
          <q-tabs vertical class="text-secondary" v-model="selectedDetail">
            <q-tab label="ｱｸｾﾝﾄ" name="accent" />
            <q-tab label="ｲﾝﾄﾈｰｼｮﾝ" name="intonation" />
          </q-tabs>
        </div>
        <div class="play-button-wrapper">
          <template v-if="!nowPlayingContinuously">
            <q-btn
              v-if="!nowPlaying && !nowGenerating"
              fab
              color="primary"
              text-color="secondary"
              icon="play_arrow"
              @click="play"
            ></q-btn>
            <q-btn
              v-else
              fab
              color="primary"
              text-color="secondary"
              icon="stop"
              @click="stop"
            ></q-btn>
            <q-btn
              round
              aria-label="音声ファイルとして保存"
              size="small"
              icon="file_download"
              @click="save()"
              :disable="nowPlaying || nowGenerating || uiLocked"
            ></q-btn>
          </template>
        </div>
      </div>
      <div class="overflow-hidden-y accent-phrase-table">
        <div
          v-for="(accentPhrase, accentPhraseIndex) in accentPhrases"
          :key="accentPhraseIndex"
          class="mora-table"
        >
          <template v-if="selectedDetail === 'accent'">
            <audio-accent
              :accentPhraseIndex="accentPhraseIndex"
              :accentPhrase="accentPhrase"
              :uiLocked="uiLocked"
              @changeAccent="changeAccent"
            />
          </template>
          <template v-if="selectedDetail === 'intonation'">
            <div
              v-for="(mora, moraIndex) in accentPhrase.moras"
              :key="moraIndex"
              class="q-mb-sm pitch-cell"
              :style="{ 'grid-column': `${moraIndex * 2 + 1} / span 1` }"
            >
              <!-- div for input width -->
              <audio-parameter
                :moraIndex="moraIndex"
                :accentPhraseIndex="accentPhraseIndex"
                :accentPhrase="accentPhrase"
                :value="mora.pitch"
                :uiLocked="uiLocked"
                :min="3"
                :max="6.5"
                :disable="mora.pitch == 0.0"
                @changeValue="changeMoraData"
              />
            </div>
            <div v-if="accentPhrase.pauseMora" />
          </template>
          <template
            v-for="(mora, moraIndex) in accentPhrase.moras"
            :key="moraIndex"
          >
            <div
              :class="getHoveredClass(accentPhraseIndex)"
              :style="{
                'grid-column': `${moraIndex * 2 + 1} / span 1`,
              }"
              @mouseover="handleHoverText(accentPhraseIndex, true)"
              @mouseleave="handleHoverText(accentPhraseIndex, false)"
            >
              {{ mora.text }}
              <q-popup-edit
                v-if="selectedDetail == 'accent' && !uiLocked"
                :model-value="pronunciationByPhrase[accentPhraseIndex]"
                auto-save
                transition-show="none"
                transition-hide="none"
                v-slot="scope"
                @save="handleChangePronounce($event, accentPhraseIndex)"
              >
                <q-input
                  v-model="scope.value"
                  dense
                  :input-style="{
                    width: `${scope.value.length + 1}em`,
                    minWidth: '50px',
                  }"
                  autofocus
                  outlined
                  @keyup.enter="scope.set"
                />
              </q-popup-edit>
            </div>
            <div
              v-if="
                accentPhraseIndex < accentPhrases.length - 1 ||
                moraIndex < accentPhrase.moras.length - 1
              "
              @click="
                uiLocked ||
                  toggleAccentPhraseSplit(accentPhraseIndex, false, moraIndex)
              "
              :class="[
                'splitter-cell',
                {
                  'splitter-cell-be-split':
                    moraIndex == accentPhrase.moras.length - 1,
                  'splitter-cell-be-split-pause': accentPhrase.pauseMora,
                },
              ]"
              :style="{ 'grid-column': `${moraIndex * 2 + 2} / span 1` }"
            />
          </template>
          <template v-if="accentPhrase.pauseMora">
            <div class="text-cell">{{ accentPhrase.pauseMora.text }}</div>
            <div
              @click="
                uiLocked || toggleAccentPhraseSplit(accentPhraseIndex, true)
              "
              class="
                splitter-cell
                splitter-cell-be-split
                splitter-cell-be-split-pause
              "
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { useStore } from "@/store";
import { useQuasar } from "quasar";
import { SaveResultObject } from "@/store/type";
import AudioAccent from "./AudioAccent.vue";
import AudioParameter from "./AudioParameter.vue";
import { HotkeyAction } from "@/type/preload";
import { setHotkeyFunctions } from "@/store/setting";

export default defineComponent({
  components: { AudioAccent, AudioParameter },

  name: "AudioDetail",

  setup() {
    const store = useStore();
    const $q = useQuasar();

    const hotkeyMap = new Map<HotkeyAction, () => void | boolean>([
      [
        "再生/停止",
        () => {
          if (!nowPlaying.value && !nowGenerating.value && !uiLocked.value) {
            play();
          } else {
            stop();
          }
        },
      ],
      [
        "一つだけ書き出し",
        () => {
          if (!uiLocked.value) {
            save();
          }
        },
      ],
      [
        "ｱｸｾﾝﾄ欄を表示",
        () => {
          if (!uiLocked.value) {
            selectedDetail.value = "accent";
          }
        },
      ],
      [
        "ｲﾝﾄﾈｰｼｮﾝ欄を表示",
        () => {
          if (!uiLocked.value) {
            selectedDetail.value = "intonation";
          }
        },
      ],
    ]);

    setHotkeyFunctions(hotkeyMap);

    // detail selector
    type DetailTypes = "accent" | "intonation";
    const selectedDetail = ref<DetailTypes>("accent");
    const selectDetail = (index: number) => {
      selectedDetail.value = index === 0 ? "accent" : "intonation";
    };

    // accent phrase
    const activeAudioKey = computed<string | undefined>(
      () => store.getters.ACTIVE_AUDIO_KEY
    );
    const uiLocked = computed(() => store.getters.UI_LOCKED);

    const audioItem = computed(() =>
      activeAudioKey.value ? store.state.audioItems[activeAudioKey.value] : null
    );
    const query = computed(() => audioItem.value?.query);
    const accentPhrases = computed(() => query.value?.accentPhrases);

    const changeAccent = (accentPhraseIndex: number, accent: number) => {
      store.dispatch("COMMAND_CHANGE_ACCENT", {
        audioKey: activeAudioKey.value!,
        accentPhraseIndex,
        accent,
      });
    };

    const toggleAccentPhraseSplit = (
      accentPhraseIndex: number,
      isPause: boolean,
      moraIndex?: number
    ) => {
      store.dispatch("COMMAND_CHANGE_ACCENT_PHRASE_SPLIT", {
        audioKey: activeAudioKey.value!,
        accentPhraseIndex,
        ...(!isPause
          ? { isPause, moraIndex: moraIndex as number }
          : { isPause }),
      });
    };

    const changeMoraData = (
      accentPhraseIndex: number,
      moraIndex: number,
      pitch: number
    ) => {
      store.dispatch("COMMAND_SET_AUDIO_MORA_DATA", {
        audioKey: activeAudioKey.value!,
        accentPhraseIndex,
        moraIndex,
        pitch,
      });
    };

    // audio play
    const play = async () => {
      try {
        await store.dispatch("PLAY_AUDIO", {
          audioKey: activeAudioKey.value!,
        });
      } catch (e) {
        $q.dialog({
          title: "再生に失敗しました",
          message: "エンジンの再起動をお試しください。",
          ok: {
            label: "閉じる",
            flat: true,
            textColor: "secondary",
          },
        });
      }
    };

    const stop = () => {
      store.dispatch("STOP_AUDIO", { audioKey: activeAudioKey.value! });
    };

    // save
    const save = async () => {
      const result: SaveResultObject = await store.dispatch(
        "GENERATE_AND_SAVE_AUDIO",
        {
          audioKey: activeAudioKey.value!,
          encoding: store.state.savingSetting.fileEncoding,
        }
      );

      if (result.result === "SUCCESS" || result.result === "CANCELED") return;

      let msg = "";
      switch (result.result) {
        case "WRITE_ERROR":
          msg =
            "書き込みエラーによって失敗しました。空き容量があることや、書き込み権限があることをご確認ください。";
          break;
        case "ENGINE_ERROR":
          msg =
            "エンジンのエラーによって失敗しました。エンジンの再起動をお試しください。";
          break;
      }

      $q.dialog({
        title: "書き出しに失敗しました。",
        message: msg,
        ok: {
          label: "閉じる",
          flat: true,
          textColor: "secondary",
        },
      });
    };

    const nowPlaying = computed(
      () => store.state.audioStates[activeAudioKey.value!]?.nowPlaying
    );
    const nowGenerating = computed(
      () => store.state.audioStates[activeAudioKey.value!]?.nowGenerating
    );

    // continuously play
    const nowPlayingContinuously = computed(
      () => store.state.nowPlayingContinuously
    );

    const pronunciationByPhrase = computed(() => {
      let textArray: Array<string> = [];
      accentPhrases.value?.forEach((accentPhrase) => {
        let textString = "";
        accentPhrase.moras.forEach((mora) => {
          textString += mora.text;
        });
        if (accentPhrase.pauseMora) {
          textString += "、";
        }
        textArray.push(textString);
      });
      return textArray;
    });

    const handleChangePronounce = (
      newPronunciation: string,
      phraseIndex: number
    ) => {
      let popUntilPause = false;
      newPronunciation = newPronunciation.replace(",", "、");
      if (
        newPronunciation.slice(-1) == "、" &&
        accentPhrases.value!.length - 1 != phraseIndex
      ) {
        newPronunciation += pronunciationByPhrase.value[phraseIndex + 1];
        popUntilPause = true;
      }
      store.dispatch("COMMAND_CHANGE_SINGLE_ACCENT_PHRASE", {
        audioKey: activeAudioKey.value!,
        newPronunciation,
        accentPhraseIndex: phraseIndex,
        popUntilPause,
      });
    };

    const hoveredPhraseIndex = ref<number | undefined>(undefined);

    const handleHoverText = (phraseIndex: number, isOver: boolean) => {
      if (isOver) {
        hoveredPhraseIndex.value = phraseIndex;
      } else {
        hoveredPhraseIndex.value = undefined;
      }
    };

    const getHoveredClass = (accentPhraseIndex: number) => {
      if (
        selectedDetail.value == "accent" &&
        !uiLocked.value &&
        accentPhraseIndex === hoveredPhraseIndex.value
      ) {
        return "text-cell-hovered";
      } else {
        return "text-cell";
      }
    };

    return {
      selectDetail,
      selectedDetail,
      activeAudioKey,
      uiLocked,
      audioItem,
      query,
      accentPhrases,
      changeAccent,
      toggleAccentPhraseSplit,
      changeMoraData,
      play,
      stop,
      save,
      nowPlaying,
      nowGenerating,
      nowPlayingContinuously,
      pronunciationByPhrase,
      handleChangePronounce,
      handleHoverText,
      getHoveredClass,
    };
  },
});
</script>

<style scoped lang="scss">
@use '@/styles' as global;
@import "~quasar/src/css/variables";

$pitch-label-height: 24px;

.root > div {
  display: flex;
  flex-direction: row;
  align-items: center;

  .side {
    height: 100%;

    display: flex;
    flex-direction: column;
    justify-content: space-between;
    .detail-selector .q-tab--active {
      background-color: rgba(global.$primary, 0.3);
      :deep(.q-tab__indicator) {
        background-color: global.$primary;
      }
    }
    .play-button-wrapper {
      align-self: flex-end;
      display: flex;
      align-items: flex-end;
      flex-wrap: nowrap;
      flex-direction: row-reverse;
      justify-content: space-between;
      margin: 10px;
      gap: 0 5px;
    }
  }

  .accent-phrase-table {
    flex-grow: 1;
    align-self: stretch;
    margin-left: 5px;
    margin-right: 5px;
    margin-bottom: 5px;
    padding-left: 5px;

    display: flex;
    overflow-x: scroll;

    .mora-table {
      display: inline-grid;
      align-self: stretch;
      grid-template-rows: 1fr 60px 30px;

      div {
        padding: 0px;
        &.text-cell {
          min-width: 30px;
          max-width: 30px;
          grid-row-start: 3;
          text-align: center;
          color: global.$secondary;
        }
        &.text-cell-hovered {
          min-width: 30px;
          max-width: 30px;
          grid-row-start: 3;
          text-align: center;
          color: global.$secondary;
          font-weight: bold;
          cursor: pointer;
        }
        &.splitter-cell {
          min-width: 10px;
          max-width: 10px;
          grid-row: 3 / span 1;
          z-index: global.$detail-view-splitter-cell-z-index;
        }
        &.splitter-cell:hover {
          background-color: #cdf;
          cursor: pointer;
        }
        &.splitter-cell-be-split {
          min-width: 40px;
          max-width: 40px;
          grid-row: 1 / span 3;
        }
        &.splitter-cell-be-split-pause {
          min-width: 10px;
          max-width: 10px;
        }
        &.accent-cell {
          grid-row: 2 / span 1;
          div {
            min-width: 30px + 10px;
            max-width: 30px + 10px;
            display: inline-block;
            cursor: pointer;
          }
        }
        &.pitch-cell {
          grid-row: 1 / span 2;
          min-width: 30px;
          max-width: 30px;
          display: inline-block;
          position: relative;
        }
      }
    }
  }
}
</style>
