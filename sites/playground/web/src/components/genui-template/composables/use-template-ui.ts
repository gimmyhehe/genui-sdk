import { computed, ref } from 'vue';
import { useIsMobile } from '../../../use-mobile';

type MobileSheetMode = 'closed' | 'preview' | 'json';
type SidePanel = 'history';

const rendererPanelVisible = ref(false);
const schemaEditorVisible = ref(false);
const mobileSheetMode = ref<MobileSheetMode>('closed');
const sidePanel = ref<SidePanel | null>(null);

const isMobileSheetOpen = computed(() => mobileSheetMode.value !== 'closed');
const isHistoryPanelOpen = computed(() => sidePanel.value === 'history');

export function useTemplateUi() {
  const { isMobile } = useIsMobile();

  const isJsonEditorActive = computed(() =>
    isMobile.value ? mobileSheetMode.value === 'json' : schemaEditorVisible.value,
  );

  const setRendererPanelVisible = (visible: boolean) => {
    rendererPanelVisible.value = visible;
  };

  const setMobileJsonOpen = (open: boolean) => {
    if (mobileSheetMode.value === 'closed') {
      return;
    }
    mobileSheetMode.value = open ? 'json' : 'preview';
  };

  const setJsonEditorOpen = (open: boolean) => {
    if (isMobile.value) {
      setMobileJsonOpen(open);
      return;
    }
    schemaEditorVisible.value = open;
  };

  const openSheet = () => {
    mobileSheetMode.value = 'preview';
  };

  const closeSheet = () => {
    mobileSheetMode.value = 'closed';
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
  };

  return {
    schemaEditorVisible,
    rendererPanelVisible,
    isJsonEditorActive,
    isHistoryPanelOpen,
    isMobileSheetOpen,
    setJsonEditorOpen,
    setRendererPanelVisible,
    openSheet,
    closeSheet,
    toggleHistoryPanel,
    closeHistoryPanel,
    resetUi,
  };
}
