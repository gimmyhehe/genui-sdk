<script setup lang="ts">
import { computed } from 'vue';
import { iconClose, iconTime } from '@opentiny/vue-icon';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import GenuiTemplateMobileSheet from './GenuiTemplateMobileSheet.vue';
import { useTemplateSchema } from './composables/use-template-schema';
import {
  useTemplatePage,
  useSchemaEditor,
  useSchemaDiff,
  useSchemaVersionHistory,
  useTemplateVersionControl,
  useTemplateHistoryUi,
  useTemplateMobileUi,
} from './composables';
import viewSchemaIcon from '../../assets/images/view-schema.svg';

defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const TinyCloseIcon = iconClose();
const TinyIconTime = iconTime();

const { currentPreviewSchema, currentPreviewSchemaComplete, currentCardId } = useTemplateSchema();
const {
  schemaEditorText,
  schemaEditorSaveLoading,
  applyTextToPreview,
  editorOptions,
  hasUnsavedChanges,
} = useSchemaEditor();
const {
  schemaEditorShowDiffView,
  schemaEditorDiffOriginal,
  schemaEditorDiffModified,
} = useSchemaDiff();
const { showReturnLatestButton, selectVersionCard, onSchemaRefresh } = useTemplateVersionControl();
const { schemaVersionHistoryGroups } = useSchemaVersionHistory();
const { schemaHistoryVisible, toggleSchemaHistoryPanel, closeSchemaHistoryPanel } = useTemplateHistoryUi();
const {
  sheetVisible: schemaEditorVisible,
  jsonEditorOpen,
  mobileSheetPanelStyle,
  onMaskClick,
  onMobileSheetGrabTouchStart,
} = useTemplateMobileUi();
const schemaEditorDirty = computed(
  () => jsonEditorOpen.value && hasUnsavedChanges(),
);

const {
  closeSchemaEditorView,
  handleMobileJsonEditorOpen,
  handleHistoryEntrySelect,
  toggleSchemaVersion,
  applyCurrentVersion,
  handleSaveSchemaEditor,
  resetToLatestVersion,
} = useTemplatePage();
</script>

<template>
  <div class="genui-schema-template is-mobile">
    <div class="genui-schema-template-item chat-container">
      <genui-template-chat
        class="genui-template-chat"
        @schema-version-toggle="toggleSchemaVersion"
        @schema-version-select="selectVersionCard"
        @schema-refresh="onSchemaRefresh"
      />
    </div>
    <genui-template-mobile-sheet
      :visible="schemaEditorVisible"
      :json-editor-open="jsonEditorOpen"
      :panel-style="mobileSheetPanelStyle"
      :show-return-latest-button="showReturnLatestButton"
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
      @update:schema-editor="applyTextToPreview"
      @mask-click="onMaskClick"
      @grab-touch-start="onMobileSheetGrabTouchStart"
      @close="closeSchemaEditorView"
      @toggle-history="toggleSchemaHistoryPanel"
      @close-history="closeSchemaHistoryPanel"
      @history-select="handleHistoryEntrySelect"
      @apply-current-version="applyCurrentVersion"
      @reset-to-latest-version="resetToLatestVersion"
      @save-schema-editor="handleSaveSchemaEditor"
    />
  </div>
</template>

<style scoped lang="less">
.genui-schema-template {
  display: flex;
  flex-direction: column-reverse;
  margin-bottom: 0;
  width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;

  &-item {
    flex: 1 1 50%;
    min-height: 0;
  }

  .chat-container {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
}

.genui-template-chat {
  width: 100%;
  min-height: 0;
}
</style>
