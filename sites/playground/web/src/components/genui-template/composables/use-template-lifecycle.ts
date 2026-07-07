import { watch, onMounted, onUnmounted } from 'vue';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateConversation } from './use-template-conversation';
import { useTemplateActions } from './use-template-actions';
import { disposeMobileSheetDrag } from './use-template-mobile-ui';

export function useTemplateLifecycle() {
  const { currentPreviewSchemaComplete } = useTemplateSchema();
  const { currentConversationId, templateConversationState } = useTemplateConversation();
  const {
    resetToLatestVersion,
    resetAll,
    handleKeydown,
    shouldSyncEditorBaseline,
    syncBaseline,
  } = useTemplateActions();

  watch(currentPreviewSchemaComplete, (isComplete) => {
    if (isComplete && shouldSyncEditorBaseline()) {
      syncBaseline();
    }
  });

  watch(currentConversationId, resetAll);

  watch(
    () => templateConversationState.value?.loading,
    (loading, prevLoading) => {
      if (prevLoading === true && loading === false) {
        resetToLatestVersion();
      }
    },
  );

  onMounted(() => {
    resetToLatestVersion();
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    disposeMobileSheetDrag();
  });
}
