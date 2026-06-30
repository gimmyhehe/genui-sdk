<script setup lang="ts">
import { computed } from 'vue';
import { CodeEditor, DiffEditor } from 'monaco-editor-vue3';
import { GenuiConfigProvider, GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { TinyButton } from '@opentiny/vue';
import { iconClose, iconTime } from '@opentiny/vue-icon';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import GenuiTemplateMobileSheet from './GenuiTemplateMobileSheet.vue';
import SchemaVersionHistoryPanel from './SchemaVersionHistoryPanel.vue';
import useTemplate from './composables/use-template';
import { useIsMobile } from '../../use-mobile';
import { SCHEMA_JSON_DIFF_EDITOR_OPTIONS, useMonacoPlaygroundTheme } from './composables/use-monaco-playground-theme';
import { isRenderableSchema } from './template-chat-utils';
import { useGenuiTemplate } from './composables';
import viewSchemaIcon from '../../assets/images/view-schema.svg';
import { locale, t } from '../../i18n';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue';

const { isMobile } = useIsMobile();

const TinyCloseIcon = iconClose();
const TinyIconTime = iconTime();

const {
  currentSchema,
  currentPreviewSchema,
  currentPreviewSchemaComplete,
  currentCardId,
} = useTemplate();

const props = defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const monacoTheme = useMonacoPlaygroundTheme(() => props.theme);

const {
  rendererPanelVisible,
  schemaHistoryVisible,
  schemaEditorVisible,
  mobileSchemaJsonEditorOpen,
  schemaVersionHistoryGroups,
  schemaEditorText,
  schemaEditorDiffOriginal,
  schemaEditorDiffModified,
  schemaEditorShowDiffView,
  toggleSchemaHistoryPanel,
  closeSchemaHistoryPanel,
  showReturnLatestButton,
  showApplyVersionButton,
  isSchemaEditorReadOnly,
  schemaEditorDirty,
  schemaEditorSaveLoading,
  applySchemaEditorTextToPreview,
  editorOptions,
  toggleSchemaEditor,
  closeSchemaEditorView,
  closeRendererPanel,
  onMobileSheetMaskClick,
  handleMobileJsonEditorOpen,
  mobileSheetPanelStyle,
  onMobileSheetGrabTouchStart,
  handleHistoryEntrySelect,
  toggleSchemaVersion,
  selectSchemaVersionCard,
  applyCurrentVersion,
  handleSaveSchemaEditor,
  resetToLatestVersion,
  onSchemaRefresh,
} = useGenuiTemplate();

const rendererSchema = computed(() => {
  const schema = currentPreviewSchema.value ?? currentSchema.value;
  return isRenderableSchema(schema) ? schema : null;
});

const rendererSchemaKey = computed(() => {
  const schema = rendererSchema.value as Record<string, unknown> | null;
  const componentName = schema?.componentName ?? 'schema';
  return `${currentCardId.value || 'preview'}-${String(componentName)}`;
});
</script>

<template>
  <GenuiConfigProvider
    :theme="theme"
    :locale="locale"
    :materials="materials"
    :renderer-config="rendererConfig"
    style="width: 100%; height: 100%"
  >
    <div :class="['genui-schema-template', { 'is-mobile': isMobile }]">
      <div class="genui-schema-template-item chat-container">
        <genui-template-chat
          v-show="!schemaEditorVisible || isMobile"
          class="genui-template-chat"
          @schema-version-toggle="toggleSchemaVersion"
          @schema-version-select="selectSchemaVersionCard"
          @schema-refresh="onSchemaRefresh"
        />
        <div class="schema-version-container" v-show="schemaEditorVisible && !isMobile">
          <div class="schema-version-container__header">
            <span class="schema-version-container__title">
              {{ schemaEditorShowDiffView ? t('templateEditor.schemaDiffTitle') : t('templateEditor.schemaJsonTitle') }}
            </span>
            <div class="schema-version-container__header-actions">
              <tiny-button
                v-if="schemaEditorDirty && !isSchemaEditorReadOnly"
                type="primary"
                size="small"
                round
                :loading="schemaEditorSaveLoading"
                @click="handleSaveSchemaEditor"
              >
                {{ t('templateEditor.save') }}
              </tiny-button>
              <tiny-button
                type="text"
                class="genui-schema-toolbar-close-btn"
                :icon="TinyCloseIcon"
                :aria-label="t('templateEditor.close')"
                @click="closeSchemaEditorView"
              />
            </div>
          </div>
          <div class="schema-version-container__editor">
            <diff-editor
              v-if="schemaEditorShowDiffView"
              :key="currentCardId"
              :original="schemaEditorDiffOriginal"
              :value="schemaEditorDiffModified"
              language="json"
              :theme="monacoTheme"
              :options="SCHEMA_JSON_DIFF_EDITOR_OPTIONS"
            />
            <code-editor
              v-else
              :key="`${currentCardId}-${isSchemaEditorReadOnly}`"
              :value="schemaEditorText"
              language="json"
              :theme="monacoTheme"
              :options="editorOptions"
              @update:value="applySchemaEditorTextToPreview"
            />
          </div>
        </div>
      </div>
      <genui-template-mobile-sheet
        v-if="isMobile"
        :visible="isMobile && schemaEditorVisible"
        :json-editor-open="mobileSchemaJsonEditorOpen"
        :panel-style="mobileSheetPanelStyle"
        :show-return-latest-button="showReturnLatestButton"
        :show-apply-version-button="showApplyVersionButton"
        :current-preview-schema="currentPreviewSchema"
        :current-preview-schema-complete="currentPreviewSchemaComplete"
        :schema-editor="schemaEditorText"
        :schema-editor-diff-mode="schemaEditorShowDiffView"
        :schema-editor-mount-key="currentCardId"
        :schema-editor-diff-original="schemaEditorDiffOriginal"
        :schema-editor-diff-modified="schemaEditorDiffModified"
        :editor-options="editorOptions"
        :playground-theme="theme"
        :view-schema-icon="viewSchemaIcon"
        :history-icon="TinyIconTime"
        :history-visible="schemaHistoryVisible"
        :history-groups="schemaVersionHistoryGroups"
        :close-icon="TinyCloseIcon"
        :schema-editor-dirty="schemaEditorDirty"
        :schema-editor-save-loading="schemaEditorSaveLoading"
        @update:json-editor-open="handleMobileJsonEditorOpen"
        @update:schema-editor="applySchemaEditorTextToPreview"
        @mask-click="onMobileSheetMaskClick"
        @grab-touch-start="onMobileSheetGrabTouchStart"
        @close="closeSchemaEditorView"
        @toggle-history="toggleSchemaHistoryPanel"
        @close-history="closeSchemaHistoryPanel"
        @history-select="handleHistoryEntrySelect"
        @apply-current-version="applyCurrentVersion"
        @reset-to-latest-version="resetToLatestVersion"
        @save-schema-editor="handleSaveSchemaEditor"
      />
      <template v-else>
        <div class="genui-schema-template-item renderer-container" v-if="rendererSchema && rendererPanelVisible">
          <div class="renderer-container-wrapper">
            <div class="top-button-group">
              <button type="button" class="schema-toggle-text" @click="toggleSchemaEditor">
                <img class="button-svg-icon" :src="viewSchemaIcon" alt="" />
                {{ schemaEditorShowDiffView ? t('templateEditor.viewChanges') : t('templateEditor.viewJson') }}
              </button>
              <div class="top-button-group-right">
                <tiny-button v-if="showReturnLatestButton" type="primary" round @click="resetToLatestVersion">
                  {{ t('templateEditor.returnLatest') }}
                </tiny-button>
                <tiny-button v-if="showApplyVersionButton" round @click="applyCurrentVersion">
                  {{ t('templateEditor.applyVersion') }}
                </tiny-button>
                <tiny-button
                  type="text"
                  class="genui-schema-toolbar-close-btn"
                  :class="{ 'is-active': schemaHistoryVisible }"
                  :icon="TinyIconTime"
                  :aria-label="t('templateEditor.history')"
                  :title="t('templateEditor.history')"
                  @click="toggleSchemaHistoryPanel"
                />
                <tiny-button
                  type="text"
                  class="genui-schema-toolbar-close-btn"
                  :icon="TinyCloseIcon"
                  :aria-label="t('templateEditor.closePreview')"
                  @click="closeRendererPanel"
                />
              </div>
            </div>
            <div class="schema-renderer-body">
              <schema-renderer
                :key="rendererSchemaKey"
                class="schema-renderer"
                :content="rendererSchema"
                :generating="false"
                :is-json-complete="true"
              />
              <schema-version-history-panel
                :visible="schemaHistoryVisible"
                :groups="schemaVersionHistoryGroups"
                :theme="theme"
                @close="closeSchemaHistoryPanel"
                @select="handleHistoryEntrySelect"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </GenuiConfigProvider>
</template>

<style scoped lang="less">
@schema-toolbar-height: 64px;

.genui-schema-template {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;

  &-item {
    flex: 1;
    min-height: 0;
  }

  & .chat-container {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  & .renderer-container {
    overflow: auto;
    min-height: 0;
    box-sizing: border-box;

    &-wrapper {
      background-color: #ffffff;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      position: relative;
      border-left: 1px solid rgb(232, 232, 232);

      .top-button-group {
        flex-shrink: 0;
        box-sizing: border-box;
        height: @schema-toolbar-height;
        min-height: @schema-toolbar-height;
        max-height: @schema-toolbar-height;
        border-bottom: 1px solid rgb(232, 232, 232);
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .button-svg-icon {
          width: 16px;
          height: 16px;
          margin-right: 6px;
          vertical-align: middle;
        }

        .schema-toggle-text {
          display: inline-flex;
          align-items: center;
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
          font: inherit;
          text-align: inherit;
          color: #191919;
          text-decoration: none;
          cursor: pointer;
          user-select: none;

          &:hover {
            color: #191919;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          &:focus-visible {
            outline: 2px solid #1890ff;
            outline-offset: 2px;
            border-radius: 4px;
          }
        }

        .top-button-group-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      }

      .schema-renderer-body {
        flex: 1;
        min-height: 0;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .schema-renderer {
        flex: 1;
        min-height: 0;
        padding: 20px;
        overflow: auto;
        box-sizing: border-box;
      }

      .genui-schema-toolbar-close-btn.is-active {
        color: #1677ff;
        background: rgba(22, 119, 255, 0.1);
      }
    }
  }

  &.is-mobile {
    flex-direction: column-reverse;
    margin-bottom: 0;

    .genui-schema-template-item {
      flex: 1 1 50%;
      min-height: 0;
    }
  }
}

.genui-template-chat {
  width: 100%;
  min-height: 0;
}

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
  }
}

.schema-version-container {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
  background: #fff;

  &__header {
    flex-shrink: 0;
    box-sizing: border-box;
    height: @schema-toolbar-height;
    min-height: @schema-toolbar-height;
    max-height: @schema-toolbar-height;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    border-bottom: 1px solid rgb(232, 232, 232);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: rgb(25, 25, 25);
    line-height: 22px;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__editor {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__editor :deep(.monaco-code-editor),
  &__editor :deep(.monaco-diff-editor) {
    flex: 1;
    min-height: 0;
  }
}
</style>
