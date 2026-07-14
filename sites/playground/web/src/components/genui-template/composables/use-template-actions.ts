import { computed, unref, type UnwrapNestedRefs } from 'vue';
import { useIsMobile } from '../../../use-mobile';
import { isRenderableSchema, rebuildSchemaFromCard } from '../template-chat-utils';
import type { ISchemaVersionHistoryEntry } from '../template-chat-utils/schema-version-history';
import { useTemplateVersionControl } from './use-template-version-control';
import { useSchemaEditor } from './use-schema-editor';
import { useTemplateUi } from './use-template-ui';

export interface TemplateActionsDeps {
  versionControl: UnwrapNestedRefs<ReturnType<typeof useTemplateVersionControl>>;
  editor: ReturnType<typeof useSchemaEditor>;
  ui: UnwrapNestedRefs<ReturnType<typeof useTemplateUi>>;
}

export function useTemplateActions(deps?: TemplateActionsDeps) {
  const { isMobile } = useIsMobile();
  const versionControl = deps?.versionControl ?? useTemplateVersionControl();
  const editor = deps?.editor ?? useSchemaEditor();
  const ui = deps?.ui ?? useTemplateUi();

  const isJsonEditorActive = computed(() => unref(ui.isJsonEditorActive));

  const schemaEditorDirty = computed(
    () => isJsonEditorActive.value && editor.hasUnsavedChanges(),
  );

  const closeSchemaEditorView = () => {
    editor.revertUnsavedChanges();
    if (isMobile.value) {
      ui.closeSheet();
    } else {
      ui.setJsonEditorOpen(false);
    }
    versionControl.resetVersionPreviewMode();
  };

  const closeRendererPanel = () => {
    ui.setRendererPanelVisible(false);
    closeSchemaEditorView();
  };

  const setJsonEditorOpen = (open: boolean) => {
    if (open === isJsonEditorActive.value) {
      return;
    }
    open ? editor.syncBaseline() : editor.revertUnsavedChanges();
    ui.setJsonEditorOpen(open);
  };

  const toggleSchemaEditor = () => setJsonEditorOpen(!isJsonEditorActive.value);

  const handleMobileJsonEditorOpen = (open: boolean) => setJsonEditorOpen(open);

  const toggleSchemaVersion = (
    schema: Record<string, unknown>,
    cardId: string,
    options: { diffFromHistory?: boolean } = {},
  ) => {
    if (editor.hasUnsavedChanges()) {
      editor.revertUnsavedChanges();
    }
    versionControl.previewVersion(schema, cardId, options);
    ui.setRendererPanelVisible(true);
    if (isMobile.value) {
      ui.openSheet();
      editor.syncBaseline();
      return;
    }
    if (unref(ui.schemaEditorVisible)) {
      editor.syncBaseline();
    }
  };

  const handleSchemaVersionToggle = (
    schema: Record<string, unknown> | null,
    cardId: string,
  ) => {
    if (schema) {
      toggleSchemaVersion(schema, cardId);
      return;
    }
    versionControl.selectVersionCard(cardId);
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
    ui.closeHistoryPanel();
    setJsonEditorOpen(true);
  };

  const applyCurrentVersion = () => {
    if (!versionControl.applyCurrentVersion()) {
      return;
    }
    editor.syncBaseline();
  };

  const handleSaveSchemaEditor = async () => {
    if (!schemaEditorDirty.value || editor.schemaEditorSaveLoading.value) {
      return;
    }

    const schema = editor.parseEditorSchema();
    if (!schema || !isRenderableSchema(schema)) {
      return;
    }

    editor.schemaEditorSaveLoading.value = true;
    try {
      const saved = versionControl.writeNewVersion(schema, { prevSchema: editor.parseBaselineSchema() });
      if (saved) {
        editor.syncBaseline();
        closeSchemaEditorView();
      }
    } finally {
      editor.schemaEditorSaveLoading.value = false;
    }
  };

  const resetToLatestVersion = () => {
    versionControl.resetToLatestVersion();
    editor.syncBaseline();
    if (isJsonEditorActive.value) {
      setJsonEditorOpen(false);
    }
  };

  const resetAll = () => {
    ui.resetUi();
    resetToLatestVersion();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (isJsonEditorActive.value) {
      setJsonEditorOpen(false);
      return;
    }
    if (isMobile.value && unref(ui.isMobileSheetOpen)) {
      closeSchemaEditorView();
      return;
    }
    if (unref(ui.schemaEditorVisible)) {
      closeSchemaEditorView();
    }
  };

  const shouldSyncEditorBaseline = () => {
    if (unref(versionControl.schemaEditorShowDiffView) || editor.hasUnsavedChanges()) {
      return false;
    }
    return isJsonEditorActive.value;
  };

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
    syncBaseline: editor.syncBaseline,
    schemaEditorDirty,
  };
}
