import { computed, ref } from 'vue';

type MobileSheetMode = 'closed' | 'preview' | 'json';
type SidePanel = 'history';

const rendererPanelVisible = ref(false);
const schemaEditorVisible = ref(false);
const mobileSheetMode = ref<MobileSheetMode>('closed');
const sidePanel = ref<SidePanel | null>(null);

const MOBILE_SHEET_DEFAULT_HEIGHT_VH = 64;
const MOBILE_SHEET_MIN_HEIGHT_VH = 42;
const MOBILE_SHEET_MAX_HEIGHT_VH = 92;

const mobileSheetHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragStartY = ref(0);
const mobileSheetDragStartHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragging = ref(false);

const isMobileSheetOpen = computed(() => mobileSheetMode.value !== 'closed');
const isMobileJsonOpen = computed(() => mobileSheetMode.value === 'json');
const isHistoryPanelOpen = computed(() => sidePanel.value === 'history');

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
  const openEditor = () => {
    schemaEditorVisible.value = true;
  };

  const closeEditor = () => {
    schemaEditorVisible.value = false;
  };

  const toggleEditor = () => {
    schemaEditorVisible.value = !schemaEditorVisible.value;
  };

  const closeRendererPanel = () => {
    rendererPanelVisible.value = false;
  };

  const showRendererPanel = () => {
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
    mobileSheetMode.value = 'preview';
    resetMobileSheetHeight({ resetDragging: false });
  };

  const closeSheet = () => {
    mobileSheetMode.value = 'closed';
    resetMobileSheetHeight();
    disposeMobileSheetDrag();
  };

  const setMobileJsonOpen = (open: boolean) => {
    if (mobileSheetMode.value === 'closed') {
      return;
    }
    mobileSheetMode.value = open ? 'json' : 'preview';
  };

  const onMaskClick = () => {
    if (mobileSheetMode.value === 'json') {
      mobileSheetMode.value = 'preview';
    }
  };

  const toggleHistoryPanel = () => {
    sidePanel.value = sidePanel.value === 'history' ? null : 'history';
  };

  const closeHistoryPanel = () => {
    sidePanel.value = null;
  };

  const resetUi = () => {
    schemaEditorVisible.value = false;
    rendererPanelVisible.value = false;
    mobileSheetMode.value = 'closed';
    sidePanel.value = null;
    resetMobileSheetHeight();
    disposeMobileSheetDrag();
  };

  return {
    rendererPanelVisible,
    schemaEditorVisible,
    mobileSheetMode,
    isMobileSheetOpen,
    isMobileJsonOpen,
    isHistoryPanelOpen,
    mobileSheetPanelStyle,
    openEditor,
    closeEditor,
    toggleEditor,
    closeRendererPanel,
    showRendererPanel,
    onMobileSheetGrabTouchStart,
    openSheet,
    closeSheet,
    setMobileJsonOpen,
    onMaskClick,
    resetMobileSheetHeight,
    toggleHistoryPanel,
    closeHistoryPanel,
    resetUi,
  };
}
