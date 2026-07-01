import { computed, ref } from 'vue';
import { isRenderableSchema } from '../template-chat-utils';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateConversation } from './use-template-conversation';
import { useSchemaVersionWrite } from './use-schema-version-write';
import { useSchemaVersionHistory } from './use-schema-version-history';

const historyDiffCardId = ref<string | null>(null);

export function useTemplateVersionControl() {
  const {
    currentCardId,
    adoptedCardId,
    currentSchema,
    currentPreviewSchema,
    setCurrentSchema,
    setCurrentPreviewSchema,
    applySchemaFromMessages,
  } = useTemplateSchema();
  const { templateConversationState } = useTemplateConversation();
  const { writeNewVersion } = useSchemaVersionWrite();

  const {
    isLatestSchemaVersionCard,
    currentHistoryEntry,
    allSchemaVersionHistoryEntries,
  } = useSchemaVersionHistory();

  const isDiffMode = computed(
    () => historyDiffCardId.value !== null && historyDiffCardId.value === currentCardId.value,
  );

  const showReturnLatestButton = computed(() => {
    const cardId = currentCardId.value;
    if (!cardId) {
      return false;
    }
    if (adoptedCardId.value && cardId === adoptedCardId.value) {
      return false;
    }
    return !isLatestSchemaVersionCard(cardId);
  });

  const clearHistoryDiffView = () => {
    historyDiffCardId.value = null;
  };

  const previewVersion = (
    schema: Record<string, unknown>,
    cardId: string,
    previewOptions: { diffFromHistory?: boolean } = {},
  ) => {
    currentCardId.value = cardId;
    historyDiffCardId.value = previewOptions.diffFromHistory ? cardId : null;
    setCurrentPreviewSchema(schema);
    if (isLatestSchemaVersionCard(cardId)) {
      setCurrentSchema(schema);
      adoptedCardId.value = cardId;
    }
  };

  const selectVersionCard = (cardId: string) => {
    if (!cardId) {
      return;
    }
    currentCardId.value = cardId;
    clearHistoryDiffView();
  };

  const resolvePrevSchema = () => {
    const effectiveSchema = currentSchema.value;
    if (
      effectiveSchema
      && typeof effectiveSchema === 'object'
      && !Array.isArray(effectiveSchema)
      && isRenderableSchema(effectiveSchema)
    ) {
      return effectiveSchema as Record<string, unknown>;
    }
    return undefined;
  };

  const resolveSourceMetadata = () => {
    const cardId = currentCardId.value;
    const fallbackEntry = allSchemaVersionHistoryEntries.value.find((entry) => entry.cardId === cardId);
    return {
      sourceCardGeneratedTime: currentHistoryEntry.value?.generatedTime ?? fallbackEntry?.generatedTime,
      sourceCardInput: currentHistoryEntry.value?.input ?? fallbackEntry?.input,
    };
  };

  const applyCurrentVersion = () => {
    if (!showReturnLatestButton.value) {
      return false;
    }

    const schema = currentPreviewSchema.value;
    if (!schema || !isRenderableSchema(schema)) {
      return false;
    }

    const saved = writeNewVersion(schema as Record<string, unknown>, {
      prevSchema: resolvePrevSchema(),
      sourceCardId: currentCardId.value,
      ...resolveSourceMetadata(),
    });
    if (!saved) {
      return false;
    }

    clearHistoryDiffView();
    return true;
  };

  const resetToLatestVersion = () => {
    const conversationState = templateConversationState.value;
    if (!conversationState) {
      return;
    }
    const currentConversation = conversationState.conversations.find(
      (item) => item.id === conversationState.currentId,
    );
    applySchemaFromMessages(currentConversation?.messages, {
      clearIfMissing: !conversationState.loading,
    });
    clearHistoryDiffView();
  };

  const onSchemaRefresh = () => {
    adoptedCardId.value = currentCardId.value;
    clearHistoryDiffView();
  };

  return {
    historyDiffCardId,
    isDiffMode,
    showReturnLatestButton,
    previewVersion,
    selectVersionCard,
    applyCurrentVersion,
    resetToLatestVersion,
    onSchemaRefresh,
    clearHistoryDiffView,
  };
}
