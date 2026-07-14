import { computed, ref } from 'vue';

type SidePanel = 'history';

const rendererPanelVisible = ref(false);
const schemaEditorVisible = ref(false);
const sidePanel = ref<SidePanel | null>(null);

const isHistoryPanelOpen = computed(() => sidePanel.value === 'history');
const isJsonEditorActive = computed(() => schemaEditorVisible.value);

export function useTemplateUi() {
  const setRendererPanelVisible = (visible: boolean) => {
    rendererPanelVisible.value = visible;
  };

  const setJsonEditorOpen = (open: boolean) => {
    schemaEditorVisible.value = open;
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
    sidePanel.value = null;
  };

  return {
    schemaEditorVisible,
    rendererPanelVisible,
    isJsonEditorActive,
    isHistoryPanelOpen,
    setJsonEditorOpen,
    setRendererPanelVisible,
    toggleHistoryPanel,
    closeHistoryPanel,
    resetUi,
  };
}
