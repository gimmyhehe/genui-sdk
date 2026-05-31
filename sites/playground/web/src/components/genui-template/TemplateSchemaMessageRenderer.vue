<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import SchemaVersionCard from './SchemaVersionCard.vue';
import { useIsMobile } from '../../use-mobile';
import {
  findSchemaCardByCardId,
  findManualCardInMessages,
  rebuildSchemaFromCard,
  isRenderableSchema,
} from './template-chat-utils';

const props = defineProps<{
  itemProps: any;
  type: 'json-patch' | 'schema-card' | 'schema-manual';
  prevSchema: string;
  errorMessagesMap: Map<string, string>;
  messages: any[];
}>();

const emit = defineEmits<{
  (event: 'schema-version-toggle', schema: Record<string, unknown>, cardId: string): void;
}>();

const { isMobile } = useIsMobile();

const generating = computed(() => !props.itemProps?.generatedTime);

const genuiRendererProps = computed(() => ({
  ...props.itemProps,
  requiredCompleteFieldSelectors: props.itemProps?.requiredCompleteFieldSelectors || [],
  generating: generating.value,
  key: props.itemProps?.cardId,
}));

/**
 * 点击版本卡片：还原 schema 并通知父组件切换预览
 * @param cardId 版本卡片 id 或手动编辑 editId
 */
const handleSchemaVersionCardClick = (cardId: string) => {
  const card =
    findSchemaCardByCardId(props.messages, cardId)
    ?? findManualCardInMessages(props.messages, cardId);
  if (!card) {
    return;
  }

  const schema = rebuildSchemaFromCard(card);
  if (!schema || !isRenderableSchema(schema)) {
    return;
  }

  emit('schema-version-toggle', schema, cardId);
};
</script>

<template>
  <div v-if="generating && isMobile">
    <genui-renderer v-bind="genuiRendererProps" />
  </div>
  <schema-version-card
    v-else
    :key="itemProps?.cardId"
    :prev-schema="prevSchema"
    :error-messages-map="errorMessagesMap"
    :type="type"
    v-bind="itemProps"
    @click="handleSchemaVersionCardClick"
  />
</template>
