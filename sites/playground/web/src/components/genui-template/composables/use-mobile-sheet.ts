import { computed, onUnmounted, ref } from 'vue';

const MOBILE_SHEET_DEFAULT_HEIGHT_VH = 64;
const MOBILE_SHEET_MIN_HEIGHT_VH = 42;
const MOBILE_SHEET_MAX_HEIGHT_VH = 92;

export function useMobileSheet() {
  const mobileSheetHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
  const mobileSheetDragStartY = ref(0);
  const mobileSheetDragStartHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
  const mobileSheetDragging = ref(false);

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

  const removeMobileSheetDragListeners = () => {
    window.removeEventListener('touchmove', handleMobileSheetDragMove);
    window.removeEventListener('touchend', handleMobileSheetDragEnd);
    window.removeEventListener('touchcancel', handleMobileSheetDragEnd);
    mobileSheetDragging.value = false;
  };

  function handleMobileSheetDragEnd() {
    if (!mobileSheetDragging.value) {
      return;
    }
    removeMobileSheetDragListeners();
    mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetHeightVh.value);
  }

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

  onUnmounted(() => {
    removeMobileSheetDragListeners();
  });

  return {
    mobileSheetPanelStyle,
    onMobileSheetGrabTouchStart,
    resetMobileSheetHeight,
  };
}
