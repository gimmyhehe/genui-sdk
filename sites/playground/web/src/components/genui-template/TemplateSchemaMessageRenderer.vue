<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import SchemaVersionCard from './SchemaVersionCard.vue';
import { useIsMobile } from '../../use-mobile';
import { useTemplateConversation } from './composables/use-template-conversation';
import { useSchemaVersionWrite } from './composables/use-schema-version-write';
import { useTemplatePage } from './composables/use-template-page';
import { useTemplateVersionControl } from './composables/use-template-version-control';
import { rebuildSchemaFromCard } from './template-chat-utils';

const props = defineProps<{
  itemProps: any;
  type: 'json-patch' | 'schema-card' | 'schema-manual';
  prevSchema: string;
  errorMessagesMap: Map<string, string>;
}>();

const { isMobile } = useIsMobile();
const { messages } = useTemplateConversation();
const { getMessageByCardId } = useSchemaVersionWrite();
const { toggleSchemaVersion } = useTemplatePage();
const { selectVersionCard } = useTemplateVersionControl();

const generating = computed(() => !props.itemProps?.generatedTime);

const genuiRendererProps = computed(() => ({
  ...props.itemProps,
  requiredCompleteFieldSelectors: props.itemProps?.requiredCompleteFieldSelectors || [],
  generating: generating.value,
  key: props.itemProps?.cardId,
}));

const schemaVersionCardProps = computed(() => ({
  ...props.itemProps,
  prevSchema: props.prevSchema || props.itemProps?.prevSchema || '',
}));

const handleSchemaVersionCardClick = (cardId: string) => {
  if (!cardId) {
    return;
  }

  const card = getMessageByCardId(cardId);
  const schema = card ? rebuildSchemaFromCard(card, { messages: messages.value }) : null;
  if (schema && card) {
    toggleSchemaVersion(schema, cardId);
    return;
  }

  selectVersionCard(cardId);
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
