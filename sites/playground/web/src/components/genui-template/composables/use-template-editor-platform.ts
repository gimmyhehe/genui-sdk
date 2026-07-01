import { computed } from 'vue';
import { useIsMobile } from '../../../use-mobile';
import { useTemplateEditorUi } from './use-template-editor-ui';
import { useTemplateMobileUi } from './use-template-mobile-ui';

export function useTemplateEditorPlatform() {
  const { isMobile } = useIsMobile();
  const {
    schemaEditorVisible,
    rendererPanelVisible,
    closeEditor,
    closeRendererPanel: hideRendererPanel,
    toggleEditor,
    openEditor,
    resetUi: resetEditorUi,
  } = useTemplateEditorUi();
  const {
    sheetVisible,
    jsonEditorOpen,
    closeSheet,
    setJsonEditorOpen,
    openSheet,
    resetUi: resetMobileUi,
  } = useTemplateMobileUi();

  const schemaEditorVisibleUnified = computed(() =>
    isMobile.value ? sheetVisible.value : schemaEditorVisible.value,
  );

  const isJsonEditorActive = computed(() =>
    isMobile.value ? jsonEditorOpen.value : schemaEditorVisible.value,
  );

  const closeSchemaEditor = (revertUnsavedChanges: () => void) => {
    revertUnsavedChanges();
    if (isMobile.value) {
      closeSheet();
    } else {
      closeEditor();
    }
  };

  const closeRendererPanel = (revertUnsavedChanges: () => void) => {
    hideRendererPanel();
    closeSchemaEditor(revertUnsavedChanges);
  };

  const toggleDesktopSchemaEditor = (actions: {
    revertUnsavedChanges: () => void;
    syncBaseline: () => void;
  }) => {
    if (schemaEditorVisible.value) {
      actions.revertUnsavedChanges();
    } else {
      actions.syncBaseline();
    }
    toggleEditor();
  };

  const setJsonEditorOpenState = (
    open: boolean,
    actions: { revertUnsavedChanges: () => void; syncBaseline: () => void },
  ) => {
    if (open) {
      actions.syncBaseline();
    } else {
      actions.revertUnsavedChanges();
    }
    setJsonEditorOpen(open);
  };

  const afterVersionPreview = (actions: { syncBaseline: () => void }) => {
    rendererPanelVisible.value = true;
    if (isMobile.value) {
      openSheet();
      actions.syncBaseline();
      return;
    }
    if (schemaEditorVisible.value) {
      actions.syncBaseline();
    }
  };

  const openEditorAfterHistorySelect = (actions: { syncBaseline: () => void }) => {
    actions.syncBaseline();
    if (isMobile.value) {
      setJsonEditorOpen(true);
    } else {
      openEditor();
    }
  };

  const handleEscape = (actions: {
    revertUnsavedChanges: () => void;
    closeSchemaEditorView: () => void;
    closeJsonEditor: () => void;
  }) => {
    if (isMobile.value && sheetVisible.value && jsonEditorOpen.value) {
      actions.closeJsonEditor();
      return true;
    }
    if (isMobile.value && sheetVisible.value) {
      actions.closeSchemaEditorView();
      return true;
    }
    if (schemaEditorVisible.value) {
      actions.closeSchemaEditorView();
      return true;
    }
    return false;
  };

  const resetUi = () => {
    resetEditorUi();
    resetMobileUi();
    closeSheet();
  };

  return {
    isMobile,
    schemaEditorVisible: schemaEditorVisibleUnified,
    isJsonEditorActive,
    closeSchemaEditor,
    closeRendererPanel,
    toggleDesktopSchemaEditor,
    setJsonEditorOpen: setJsonEditorOpenState,
    afterVersionPreview,
    openEditorAfterHistorySelect,
    handleEscape,
    resetUi,
  };
}
