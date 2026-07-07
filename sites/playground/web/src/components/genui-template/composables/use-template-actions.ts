import { computed } from 'vue';
import { isRenderableSchema, rebuildSchemaFromCard } from '../template-chat-utils';
import type { ISchemaVersionHistoryEntry } from '../template-chat-utils/schema-version-history';
import { useSchemaVersionWrite } from './use-schema-version-write';
import { useTemplateVersionControl } from './use-template-version-control';
import { useSchemaEditor } from './use-schema-editor';
import { useTemplateUi } from './use-template-ui';

const isJsonEditorActive = computed(() => {
  const { schemaEditorVisible, jsonEditorOpen } = useTemplateUi();
  return schemaEditorVisible.value || jsonEditorOpen.value;
});

const schemaEditorDirty = computed(() => {
  const { hasUnsavedChanges } = useSchemaEditor();
  return isJsonEditorActive.value && hasUnsavedChanges();
});

const closeSchemaEditorView = () => {
  const { closeSchemaEditor } = useTemplateUi();
  const { revertUnsavedChanges } = useSchemaEditor();
  const { clearHistoryDiffView } = useTemplateVersionControl();
  closeSchemaEditor(revertUnsavedChanges);
  clearHistoryDiffView();
};

const closeRendererPanel = () => {
  const { closeRendererPanel: closeRendererPanelUi } = useTemplateUi();
  const { revertUnsavedChanges } = useSchemaEditor();
  const { clearHistoryDiffView } = useTemplateVersionControl();
  closeRendererPanelUi(revertUnsavedChanges);
  clearHistoryDiffView();
};

const toggleSchemaEditor = () => {
  const { toggleDesktopSchemaEditor } = useTemplateUi();
  const { revertUnsavedChanges, syncBaseline } = useSchemaEditor();
  toggleDesktopSchemaEditor({ revertUnsavedChanges, syncBaseline });
};

const handleMobileJsonEditorOpen = (open: boolean) => {
  const { setJsonEditorOpen } = useTemplateUi();
  const { revertUnsavedChanges, syncBaseline } = useSchemaEditor();
  setJsonEditorOpen(open, { revertUnsavedChanges, syncBaseline });
};

const toggleSchemaVersion = (
  schema: Record<string, unknown>,
  cardId: string,
  options: { diffFromHistory?: boolean } = {},
) => {
  const { hasUnsavedChanges, revertUnsavedChanges, syncBaseline } = useSchemaEditor();
  const { previewVersion } = useTemplateVersionControl();
  const { afterVersionPreview } = useTemplateUi();

  if (hasUnsavedChanges()) {
    revertUnsavedChanges();
  }
  previewVersion(schema, cardId, options);
  afterVersionPreview({ syncBaseline });
};

const handleSchemaVersionToggle = (
  schema: Record<string, unknown> | null,
  cardId: string,
) => {
  if (schema) {
    toggleSchemaVersion(schema, cardId);
    return;
  }
  useTemplateVersionControl().selectVersionCard(cardId);
};

const handleHistoryEntrySelect = (entry: ISchemaVersionHistoryEntry) => {
  if (entry.isPending) {
    return;
  }

  const schema = rebuildSchemaFromCard(entry.cardMessage);
  if (!schema) {
    return;
  }

  const { closeSchemaHistoryPanel, openEditorAfterHistorySelect } = useTemplateUi();
  const { syncBaseline } = useSchemaEditor();

  toggleSchemaVersion(schema, entry.cardId, { diffFromHistory: true });
  closeSchemaHistoryPanel();
  openEditorAfterHistorySelect({ syncBaseline });
};

const applyCurrentVersion = () => {
  const { syncBaseline } = useSchemaEditor();
  if (!useTemplateVersionControl().applyCurrentVersion()) {
    return;
  }
  syncBaseline();
};

const handleSaveSchemaEditor = async () => {
  const {
    schemaEditorSaveLoading,
    parseEditorSchema,
    parseBaselineSchema,
    syncBaseline,
  } = useSchemaEditor();
  const { writeNewVersion } = useSchemaVersionWrite();

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
  const { syncBaseline } = useSchemaEditor();
  const { resetToLatestVersion: resetVersionToLatest } = useTemplateVersionControl();
  const { resetMobileUi } = useTemplateUi();
  resetVersionToLatest();
  syncBaseline();
  resetMobileUi();
};

const resetAll = () => {
  const { resetUi: resetEditorPlatformUi } = useTemplateUi();
  resetEditorPlatformUi();
  resetToLatestVersion();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') {
    return;
  }
  const { handleEscape } = useTemplateUi();
  const { revertUnsavedChanges } = useSchemaEditor();
  handleEscape({
    revertUnsavedChanges,
    closeSchemaEditorView,
    closeJsonEditor: () => handleMobileJsonEditorOpen(false),
  });
};

const shouldSyncEditorBaseline = () => {
  const { hasUnsavedChanges, schemaEditorShowDiffView } = useSchemaEditor();
  if (schemaEditorShowDiffView.value || hasUnsavedChanges()) {
    return false;
  }
  return isJsonEditorActive.value;
};

export function useTemplateActions() {
  const { syncBaseline } = useSchemaEditor();
  return {
    toggleSchemaEditor,
    closeSchemaEditorView,
    closeRendererPanel,
    handleMobileJsonEditorOpen,
    handleHistoryEntrySelect,
    handleSchemaVersionToggle,
    toggleSchemaVersion,
    applyCurrentVersion,
    handleSaveSchemaEditor,
    resetToLatestVersion,
    resetAll,
    handleKeydown,
    shouldSyncEditorBaseline,
    syncBaseline,
    schemaEditorDirty,
  };
}
