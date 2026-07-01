<script setup lang="ts">
import { computed } from 'vue';
import { CodeEditor, DiffEditor } from 'monaco-editor-vue3';
import { GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import type { CSSProperties } from 'vue';
import SchemaVersionHistoryPanel from './SchemaVersionHistoryPanel.vue';
import type { ISchemaVersionHistoryEntry } from './template-chat-utils/schema-version-history';
import {
  SCHEMA_JSON_DIFF_EDITOR_OPTIONS,
  useMonacoPlaygroundTheme,
  type PlaygroundColorTheme,
} from './composables/use-monaco-playground-theme';
import { t } from '../../i18n';

const props = defineProps<{
  visible: boolean;
  jsonEditorOpen: boolean;
  panelStyle: CSSProperties;
  showReturnLatestButton: boolean;
  currentPreviewSchema: Record<string, unknown> | null;
  currentPreviewSchemaComplete?: boolean | undefined;
  schemaEditor: string;
  schemaEditorDiffMode?: boolean;
  schemaEditorMountKey?: string;
  schemaEditorDiffOriginal?: string;
  schemaEditorDiffModified?: string;
  editorOptions: Record<string, unknown>;
  playgroundTheme: PlaygroundColorTheme;
  viewSchemaIcon: string;
  historyIcon: unknown;
  historyVisible: boolean;
  historyGroups: Array<{ label: string; items: ISchemaVersionHistoryEntry[] }>;
  closeIcon: unknown;
  schemaEditorDirty?: boolean;
  schemaEditorSaveLoading?: boolean;
}>();

const monacoTheme = useMonacoPlaygroundTheme(() => props.playgroundTheme);

const emit = defineEmits<{
  (event: 'update:jsonEditorOpen', value: boolean): void;
  (event: 'update:schemaEditor', value: string): void;
  (event: 'mask-click'): void;
  (event: 'grab-touch-start', value: TouchEvent): void;
  (event: 'close'): void;
  (event: 'toggle-history'): void;
  (event: 'close-history'): void;
  (event: 'history-select', entry: ISchemaVersionHistoryEntry): void;
  (event: 'apply-current-version'): void;
  (event: 'reset-to-latest-version'): void;
  (event: 'save-schema-editor'): void;
}>();

const headerTitle = computed(() => {
  if (!props.jsonEditorOpen) {
    return t('templateEditor.previewRender');
  }
  return props.schemaEditorDiffMode ? t('templateEditor.viewChanges') : t('templateEditor.schemaJsonTitle');
});

const handleJsonEditorChange = (value: string) => {
  emit('update:schemaEditor', value);
};

const toggleJsonEditor = () => {
  emit('update:jsonEditorOpen', !props.jsonEditorOpen);
};
</script>

<template>
  <Teleport to="body">
    <Transition name="schema-mobile-sheet">
      <div
        v-show="visible"
        class="schema-mobile-sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="
          jsonEditorOpen
            ? schemaEditorDiffMode
              ? t('templateEditor.jsonEditorAria')
              : t('templateEditor.jsonPreviewAria')
            : t('templateEditor.jsonPreviewAria')
        "
      >
        <div class="schema-mobile-sheet__mask" @click="emit('mask-click')" />
        <div class="schema-mobile-sheet__panel" :style="props.panelStyle">
          <div class="schema-mobile-sheet__grab" @touchstart="emit('grab-touch-start', $event)" />
          <div class="schema-mobile-sheet__header">
            <h3 class="schema-mobile-sheet__title">{{ headerTitle }}</h3>
            <div class="schema-mobile-sheet__header-actions">
              <tiny-button
                v-if="jsonEditorOpen && schemaEditorDirty && !schemaEditorDiffMode && !editorOptions.readOnly"
                type="primary"
                size="small"
                round
                :loading="schemaEditorSaveLoading"
                @click="emit('save-schema-editor')"
              >
                {{ t('templateEditor.save') }}
              </tiny-button>
              <tiny-button
                type="text"
                class="genui-schema-toolbar-close-btn"
                :class="{ 'is-active': historyVisible }"
                :icon="historyIcon"
                :aria-label="t('templateEditor.history')"
                :title="t('templateEditor.history')"
                @click="emit('toggle-history')"
              />
              <button
                type="button"
                class="schema-mobile-sheet__icon-btn"
                :class="{ 'is-active': jsonEditorOpen }"
                :aria-label="t('templateEditor.viewJson')"
                :title="t('templateEditor.viewJson')"
                @click="toggleJsonEditor"
              >
                <img class="schema-mobile-sheet__icon-btn-image" :src="viewSchemaIcon" alt="" />
              </button>
              <tiny-button
                type="text"
                class="genui-schema-toolbar-close-btn"
                :icon="closeIcon"
                :aria-label="t('templateEditor.close')"
                @click="emit('close')"
              />
            </div>
          </div>
          <div
            :class="['schema-mobile-sheet__body', { 'schema-mobile-sheet__body--with-footer': showReturnLatestButton }]"
          >
            <div
              v-if="currentPreviewSchema"
              v-show="!jsonEditorOpen"
              class="schema-mobile-sheet__preview schema-mobile-sheet__preview--solo"
            >
              <schema-renderer
                class="schema-mobile-sheet-renderer"
                :content="currentPreviewSchema"
                :generating="false"
                :isJsonComplete="currentPreviewSchemaComplete"
              />
            </div>
            <Transition name="schema-mobile-json">
              <div v-show="jsonEditorOpen" class="schema-mobile-sheet__editor schema-mobile-sheet__editor--layer">
                <diff-editor
                  v-if="schemaEditorDiffMode"
                  :key="
                    schemaEditorMountKey || `${schemaEditorDiffOriginal?.length}-${schemaEditorDiffModified?.length}`
                  "
                  :original="schemaEditorDiffOriginal || '{}'"
                  :value="schemaEditorDiffModified || schemaEditor"
                  language="json"
                  :theme="monacoTheme"
                  :options="SCHEMA_JSON_DIFF_EDITOR_OPTIONS"
                />
                <code-editor
                  v-else
                  :key="`${schemaEditorMountKey}-${editorOptions.readOnly}`"
                  :value="schemaEditor"
                  language="json"
                  :theme="monacoTheme"
                  :options="editorOptions"
                  @update:value="handleJsonEditorChange"
                />
              </div>
            </Transition>
            <schema-version-history-panel
              :visible="historyVisible"
              :groups="historyGroups"
              :theme="playgroundTheme"
              @close="emit('close-history')"
              @select="emit('history-select', $event)"
            />
          </div>
          <div v-if="showReturnLatestButton" class="schema-mobile-sheet__footer">
            <tiny-button
              round
              class="schema-mobile-sheet__latest-btn"
              @click="emit('apply-current-version')"
            >
              {{ t('templateEditor.applyVersion') }}
            </tiny-button>
            <tiny-button
              type="primary"
              round
              class="schema-mobile-sheet__latest-btn"
              @click="emit('reset-to-latest-version')"
            >
              {{ t('templateEditor.returnLatest') }}
            </tiny-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="less">
.genui-schema-toolbar-close-btn {
  flex-shrink: 0;

  &.tiny-button {
    box-sizing: border-box;
    min-width: 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    color: #666;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      color: #191919;
      background: rgba(0, 0, 0, 0.06);
    }

    &:active {
      background: rgba(0, 0, 0, 0.08);
    }

    &.is-active {
      color: #1677ff;
      background: rgba(22, 119, 255, 0.1);
    }
  }
}

.schema-mobile-sheet {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
  }

  &__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 48vh;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    transform: translateY(0);
  }

  &__grab {
    flex-shrink: 0;
    width: 36px;
    height: 4px;
    margin: 10px auto 6px;
    position: relative;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.12);
    touch-action: none;

    &::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 96px;
      height: 32px;
      transform: translate(-50%, -50%);
    }
  }

  &__header {
    flex-shrink: 0;
    flex-grow: 0;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    max-height: 64px;
    padding: 8px 12px;
    border-bottom: 1px solid rgb(232, 232, 232);
    box-sizing: border-box;
    overflow: hidden;
  }

  &__title {
    flex: 1 1 0;
    min-width: 0;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: #191919;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__header-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }

  &__icon-btn {
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    &:active {
      background: rgba(0, 0, 0, 0.08);
    }

    &.is-active {
      background: rgba(22, 119, 255, 0.1);
    }
  }

  &__icon-btn-image {
    width: 16px;
    height: 16px;
    display: block;
    object-fit: contain;
  }

  &__latest-btn {
    flex-shrink: 1;
    min-width: 0;
    max-width: 50%;
  }

  &__footer {
    z-index: 3;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #fff;

    .schema-mobile-sheet__latest-btn {
      max-width: none;
    }
  }

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }

  &__preview {
    &--solo {
      flex: 1;
      min-height: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      background: #fafafa;
    }
  }

  &__editor {
    &--layer {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #fff;
      box-sizing: border-box;
    }
  }

  &-renderer {
    min-height: 120px;
    padding: 12px;
    box-sizing: border-box;
  }

  &__editor--layer :deep(.monaco-code-editor),
  &__editor--layer :deep(.monaco-diff-editor) {
    flex: 1;
    min-height: 0;
  }
}

.schema-mobile-json-enter-active,
.schema-mobile-json-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.schema-mobile-json-enter-from,
.schema-mobile-json-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.schema-mobile-sheet-enter-active,
.schema-mobile-sheet-leave-active {
  transition: opacity 0.22s ease;

  .schema-mobile-sheet__panel {
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }
}

.schema-mobile-sheet-enter-from,
.schema-mobile-sheet-leave-to {
  opacity: 0;

  .schema-mobile-sheet__panel {
    transform: translateY(100%);
  }
}
</style>
