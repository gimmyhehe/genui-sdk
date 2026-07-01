import { ref } from 'vue';

const schemaHistoryVisible = ref(false);

export function useTemplateHistoryUi() {
  const toggleSchemaHistoryPanel = () => {
    schemaHistoryVisible.value = !schemaHistoryVisible.value;
  };

  const closeSchemaHistoryPanel = () => {
    schemaHistoryVisible.value = false;
  };

  const resetUi = () => {
    schemaHistoryVisible.value = false;
  };

  return {
    schemaHistoryVisible,
    toggleSchemaHistoryPanel,
    closeSchemaHistoryPanel,
    resetUi,
  };
}
