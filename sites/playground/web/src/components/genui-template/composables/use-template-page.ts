import { computed, watch, onMounted, onUnmounted } from 'vue';
import { isRenderableSchema, rebuildSchemaFromCard } from '../template-chat-utils';
import type { ISchemaVersionHistoryEntry } from '../template-chat-utils/schema-version-history';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateConversation } from './use-template-conversation';
import { useSchemaVersionWrite } from './use-schema-version-write';
import { useTemplateVersionControl } from './use-template-version-control';
import { useSchemaDiff } from './use-schema-diff';
import { useSchemaEditor } from './use-schema-editor';
import { useTemplateHistoryUi } from './use-template-history-ui';
import { useTemplateEditorPlatform } from './use-template-editor-platform';
import { useTemplateEditorUi } from './use-template-editor-ui';
import { useTemplateMobileUi, disposeMobileSheetDrag } from './use-template-mobile-ui';

export function useTemplatePage() {
  const { currentPreviewSchema } = useTemplateSchema();
  const { currentConversationId, templateConversationState } = useTemplateConversation();
  const { writeNewVersion } = useSchemaVersionWrite();

  const { schemaEditorVisible } = useTemplateEditorUi();
  const { jsonEditorOpen, resetUi: resetMobileUi } = useTemplateMobileUi();
  const {
    closeSchemaEditor,
    closeRendererPanel: closeRendererPanelUi,
    toggleDesktopSchemaEditor,
    setJsonEditorOpen,
    afterVersionPreview,
    openEditorAfterHistorySelect,
    handleEscape,
    resetUi: resetEditorPlatformUi,
  } = useTemplateEditorPlatform();

  const isJsonEditorActive = computed(
    () => schemaEditorVisible.value || jsonEditorOpen.value,
  );
  const { closeSchemaHistoryPanel, resetUi: resetHistoryUi } = useTemplateHistoryUi();

  const {
    clearHistoryDiffView,
    previewVersion,
    applyCurrentVersion: applyVersionCurrent,
    resetToLatestVersion: resetVersionToLatest,
  } = useTemplateVersionControl();

  const {
    schemaEditorSaveLoading,
    hasUnsavedChanges,
    syncBaseline,
    revertUnsavedChanges,
    parseEditorSchema,
    parseBaselineSchema,
  } = useSchemaEditor();

  const { schemaEditorShowDiffView } = useSchemaDiff();

  const schemaEditorDirty = computed(
    () => isJsonEditorActive.value && hasUnsavedChanges(),
  );

  const closeSchemaEditorView = () => {
    closeSchemaEditor(revertUnsavedChanges);
    clearHistoryDiffView();
  };

  const closeRendererPanel = () => {
    closeRendererPanelUi(revertUnsavedChanges);
    clearHistoryDiffView();
  };

  const toggleSchemaEditor = () => {
    toggleDesktopSchemaEditor({ revertUnsavedChanges, syncBaseline });
  };

  const handleMobileJsonEditorOpen = (open: boolean) => {
    setJsonEditorOpen(open, { revertUnsavedChanges, syncBaseline });
  };

  const toggleSchemaVersion = (
    schema: Record<string, unknown>,
    cardId: string,
    options: { diffFromHistory?: boolean } = {},
  ) => {
    if (hasUnsavedChanges()) {
      revertUnsavedChanges();
    }
    previewVersion(schema, cardId, options);
    afterVersionPreview({ syncBaseline });
  };

  const handleHistoryEntrySelect = (entry: ISchemaVersionHistoryEntry) => {
    if (entry.isPending) {
      return;
    }

    const schema = rebuildSchemaFromCard(entry.cardMessage);
    if (!schema) {
      return;
    }

    toggleSchemaVersion(schema, entry.cardId, { diffFromHistory: true });
    closeSchemaHistoryPanel();
    openEditorAfterHistorySelect({ syncBaseline });
  };

  const applyCurrentVersion = () => {
    if (!applyVersionCurrent()) {
      return;
    }
    syncBaseline();
  };

  const handleSaveSchemaEditor = async () => {
    if (!schemaEditorDirty.value || schemaEditorSaveLoading.value) {
      return;
    }

    const schema = parseEditorSchema();
    if (!schema || !isRenderableSchema(schema)) {
      return;
    }

    schemaEditorSaveLoading.value = true;
    try {
      const saved = writeNewVersion(schema, { prevSchema: parseBaselineSchema() });
      if (saved) {
        syncBaseline();
        closeSchemaEditorView();
      }
    } finally {
      schemaEditorSaveLoading.value = false;
    }
  };

  const resetToLatestVersion = () => {
    resetVersionToLatest();
    syncBaseline();
    resetMobileUi();
  };

  const resetAll = () => {
    resetEditorPlatformUi();
    resetHistoryUi();
    resetToLatestVersion();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    handleEscape({
      revertUnsavedChanges,
      closeSchemaEditorView,
      closeJsonEditor: () => handleMobileJsonEditorOpen(false),
    });
  };

  watch(
    currentPreviewSchema,
    () => {
      if (schemaEditorShowDiffView.value || hasUnsavedChanges()) {
        return;
      }
      if (isJsonEditorActive.value) {
        syncBaseline();
      }
    },
    { deep: true },
  );

  watch(currentConversationId, resetAll);

  watch(
    () => templateConversationState.value?.loading,
    (loading, prevLoading) => {
      if (prevLoading === true && loading === false) {
        resetToLatestVersion();
      }
    },
  );

  onMounted(() => {
    resetToLatestVersion();
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    disposeMobileSheetDrag();
  });

  return {
    toggleSchemaEditor,
    closeSchemaEditorView,
    closeRendererPanel,
    handleMobileJsonEditorOpen,
    handleHistoryEntrySelect,
    toggleSchemaVersion,
    applyCurrentVersion,
    handleSaveSchemaEditor,
    resetToLatestVersion,
    schemaEditorDirty,
  };
}
