<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import SchemaVersionCard from './SchemaVersionCard.vue';
import { useIsMobile } from '../../use-mobile';
import useTemplate from './composables/use-template';
import {
  rebuildSchemaFromCard,
} from './template-chat-utils';

const props = defineProps<{
  itemProps: any;
  type: 'json-patch' | 'schema-card' | 'schema-manual';
  prevSchema: string;
  errorMessagesMap: Map<string, string>;
}>();

const emit = defineEmits<{
  (event: 'schema-version-toggle', schema: Record<string, unknown>, cardId: string): void;
  (event: 'schema-version-select', cardId: string): void;
}>();

const { isMobile } = useIsMobile();
const { getMessageByCardId, messages } = useTemplate();

const generating = computed(() => !props.itemProps?.generatedTime);

const genuiRendererProps = computed(() => ({
  ...props.itemProps,
  requiredCompleteFieldSelectors: props.itemProps?.requiredCompleteFieldSelectors || [],
  generating: generating.value,
  key: props.itemProps?.cardId,
}));

const schemaVersionCardProps = computed(() => ({
  cardId: props.itemProps?.cardId ?? '',
  input: props.itemProps?.input ?? '',
  content: props.itemProps?.content ?? '',
  generatedTime: props.itemProps?.generatedTime ?? '',
  schema: props.itemProps?.schema ?? '',
  prevSchema: props.prevSchema || props.itemProps?.prevSchema || '',
}));

const handleSchemaVersionCardClick = (cardId: string) => {
  if (!cardId) {
    return;
  }

  const card = getMessageByCardId(cardId);
  const schema = card ? rebuildSchemaFromCard(card, { messages: messages.value }) : null;
  if (schema && card) {
    emit('schema-version-toggle', schema, cardId);
    return;
  }

  emit('schema-version-select', cardId);
};
</script>

<template>
  <div v-if="generating && isMobile">
    <genui-renderer v-bind="genuiRendererProps" />
  </div>
  <schema-version-card
    v-else
    :key="itemProps?.cardId"
    :type="type"
    :error-messages-map="errorMessagesMap"
    v-bind="schemaVersionCardProps"
    @card-select="handleSchemaVersionCardClick"
  />
</template>
