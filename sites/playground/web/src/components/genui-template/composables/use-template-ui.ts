import { computed, ref } from 'vue';
import { useIsMobile } from '../../../use-mobile';

const rendererPanelVisible = ref(true);
const schemaEditorVisible = ref(false);

const MOBILE_SHEET_DEFAULT_HEIGHT_VH = 64;
const MOBILE_SHEET_MIN_HEIGHT_VH = 42;
const MOBILE_SHEET_MAX_HEIGHT_VH = 92;

const sheetVisible = ref(false);
const jsonEditorOpen = ref(false);
const mobileSheetHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragStartY = ref(0);
const mobileSheetDragStartHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragging = ref(false);

const schemaHistoryVisible = ref(false);

const mobileSheetPanelStyle = computed(() => ({
  height: `${mobileSheetHeightVh.value}vh`,
}));

const clampMobileSheetHeight = (heightVh: number) =>
  Math.min(MOBILE_SHEET_MAX_HEIGHT_VH, Math.max(MOBILE_SHEET_MIN_HEIGHT_VH, heightVh));

const handleMobileSheetDragMove = (event: TouchEvent) => {
  if (!mobileSheetDragging.value) {
    return;
  }
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  const deltaY = touch.clientY - mobileSheetDragStartY.value;
  const deltaVh = (deltaY / window.innerHeight) * 100;
  mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetDragStartHeightVh.value - deltaVh);
  event.preventDefault();
};

export const disposeMobileSheetDrag = () => {
  window.removeEventListener('touchmove', handleMobileSheetDragMove);
  window.removeEventListener('touchend', handleMobileSheetDragEnd);
  window.removeEventListener('touchcancel', handleMobileSheetDragEnd);
  mobileSheetDragging.value = false;
};

function handleMobileSheetDragEnd() {
  if (!mobileSheetDragging.value) {
    return;
  }
  disposeMobileSheetDrag();
  mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetHeightVh.value);
}

export function useTemplateUi() {
  const { isMobile } = useIsMobile();

  const openEditor = () => {
    schemaEditorVisible.value = true;
  };

  const closeEditor = () => {
    schemaEditorVisible.value = false;
  };

  const toggleEditor = () => {
    schemaEditorVisible.value = !schemaEditorVisible.value;
  };

  const closeRendererPanelUi = () => {
    rendererPanelVisible.value = false;
  };

  const resetEditorUi = () => {
    schemaEditorVisible.value = false;
    rendererPanelVisible.value = true;
  };

  const onMobileSheetGrabTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    mobileSheetDragging.value = true;
    mobileSheetDragStartY.value = touch.clientY;
    mobileSheetDragStartHeightVh.value = mobileSheetHeightVh.value;
    window.addEventListener('touchmove', handleMobileSheetDragMove, { passive: false });
    window.addEventListener('touchend', handleMobileSheetDragEnd);
    window.addEventListener('touchcancel', handleMobileSheetDragEnd);
  };

  const resetMobileSheetHeight = (options?: { resetDragging?: boolean }) => {
    if (options?.resetDragging !== false) {
      mobileSheetDragging.value = false;
    }
    mobileSheetHeightVh.value = MOBILE_SHEET_DEFAULT_HEIGHT_VH;
  };

  const openSheet = () => {
    sheetVisible.value = true;
    jsonEditorOpen.value = false;
    resetMobileSheetHeight({ resetDragging: false });
  };

  const closeSheet = () => {
    sheetVisible.value = false;
    jsonEditorOpen.value = false;
    resetMobileSheetHeight();
    disposeMobileSheetDrag();
  };

  const setJsonEditorOpenState = (open: boolean) => {
    jsonEditorOpen.value = open;
  };

  const onMaskClick = () => {
    if (jsonEditorOpen.value) {
      jsonEditorOpen.value = false;
    }
  };

  const resetMobileUi = () => {
    jsonEditorOpen.value = false;
  };

  const toggleSchemaHistoryPanel = () => {
    schemaHistoryVisible.value = !schemaHistoryVisible.value;
  };

  const closeSchemaHistoryPanel = () => {
    schemaHistoryVisible.value = false;
  };

  const resetHistoryUi = () => {
    schemaHistoryVisible.value = false;
  };

  const closeSchemaEditor = (revertUnsavedChanges: () => void) => {
    revertUnsavedChanges();
    if (isMobile.value) {
      closeSheet();
    } else {
      closeEditor();
    }
  };

  const closeRendererPanel = (revertUnsavedChanges: () => void) => {
    closeRendererPanelUi();
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

  const setJsonEditorOpen = (
    open: boolean,
    actions: { revertUnsavedChanges: () => void; syncBaseline: () => void },
  ) => {
    if (open) {
      actions.syncBaseline();
    } else {
      actions.revertUnsavedChanges();
    }
    setJsonEditorOpenState(open);
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
      setJsonEditorOpenState(true);
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
    resetHistoryUi();
  };

  return {
    rendererPanelVisible,
    schemaEditorVisible,
    sheetVisible,
    jsonEditorOpen,
    mobileSheetPanelStyle,
    schemaHistoryVisible,
    openEditor,
    closeEditor,
    toggleEditor,
    closeRendererPanelUi,
    onMobileSheetGrabTouchStart,
    openSheet,
    closeSheet,
    setJsonEditorOpenState,
    onMaskClick,
    resetMobileSheetHeight,
    toggleSchemaHistoryPanel,
    closeSchemaHistoryPanel,
    closeSchemaEditor,
    closeRendererPanel,
    toggleDesktopSchemaEditor,
    setJsonEditorOpen,
    afterVersionPreview,
    openEditorAfterHistorySelect,
    handleEscape,
    resetUi,
    resetMobileUi,
  };
}
