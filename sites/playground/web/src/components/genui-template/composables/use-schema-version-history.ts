import { computed } from 'vue';
import {
  findLatestSchemaCardInConversation,
  collectSchemaVersionHistory,
  groupSchemaVersionHistory,
  filterSchemaVersionHistoryForCard,
  resolveSchemaCardScopeId,
} from '../template-chat-utils';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateConversation } from './use-template-conversation';

export function useSchemaVersionHistory() {
  const { messages } = useTemplateConversation();
  const { currentCardId } = useTemplateSchema();

  const latestSchemaCardId = computed(() => findLatestSchemaCardInConversation(messages.value)?.cardId ?? '');

  const allSchemaVersionHistoryEntries = computed(() =>
    collectSchemaVersionHistory(messages.value, {
      currentCardId: currentCardId.value,
      latestCardId: latestSchemaCardId.value,
    }),
  );

  const currentHistoryScopeCardId = computed(() =>
    currentCardId.value ? resolveSchemaCardScopeId(messages.value, currentCardId.value) : '',
  );

  const schemaVersionHistoryGroups = computed(() => {
    const scopedEntries = filterSchemaVersionHistoryForCard(
      allSchemaVersionHistoryEntries.value,
      messages.value,
      currentHistoryScopeCardId.value,
      currentCardId.value,
    );
    return groupSchemaVersionHistory(scopedEntries);
  });

  const isLatestSchemaVersionCard = (cardId: string) => {
    if (!cardId || !latestSchemaCardId.value) {
      return false;
    }
    if (cardId === latestSchemaCardId.value) {
      return true;
    }
    return allSchemaVersionHistoryEntries.value.some((entry) => entry.isLatest && entry.cardId === cardId);
  };

  const flatSchemaVersionHistoryEntries = computed(() =>
    schemaVersionHistoryGroups.value.flatMap((group) => group.items),
  );

  const currentHistoryEntry = computed(
    () => flatSchemaVersionHistoryEntries.value.find((entry) => entry.cardId === currentCardId.value) ?? null,
  );

  return {
    allSchemaVersionHistoryEntries,
    schemaVersionHistoryGroups,
    isLatestSchemaVersionCard,
    flatSchemaVersionHistoryEntries,
    currentHistoryEntry,
  };
}
