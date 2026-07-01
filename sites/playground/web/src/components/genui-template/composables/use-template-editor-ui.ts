import { ref } from 'vue';

const rendererPanelVisible = ref(true);
const schemaEditorVisible = ref(false);

export function useTemplateEditorUi() {
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

  const resetUi = () => {
    schemaEditorVisible.value = false;
    rendererPanelVisible.value = true;
  };

  return {
    rendererPanelVisible,
    schemaEditorVisible,
    openEditor,
    closeEditor,
    toggleEditor,
    closeRendererPanel,
    resetUi,
  };
}
