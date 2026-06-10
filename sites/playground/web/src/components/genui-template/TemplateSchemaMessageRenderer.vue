<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import SchemaVersionCard from './SchemaVersionCard.vue';
import { useIsMobile } from '../../use-mobile';
import useTemplate from './useTemplate';
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
}>();

const { isMobile } = useIsMobile();
const { getMessageByCardId } = useTemplate();

const generating = computed(() => !props.itemProps?.generatedTime);

const genuiRendererProps = computed(() => ({
  ...props.itemProps,
  requiredCompleteFieldSelectors: props.itemProps?.requiredCompleteFieldSelectors || [],
  generating: generating.value,
  key: props.itemProps?.cardId,
}));

/** 仅传递 SchemaVersionCard 声明的 props，避免 edits 等字段触发 extraneous attrs 警告 */
const schemaVersionCardProps = computed(() => ({
  cardId: props.itemProps?.cardId ?? '',
  input: props.itemProps?.input ?? '',
  content: props.itemProps?.content ?? '',
  generatedTime: props.itemProps?.generatedTime ?? '',
  schema: props.itemProps?.schema ?? '',
  prevSchema: props.prevSchema || props.itemProps?.prevSchema || '',
}));

/**
 * 点击版本卡片：还原 schema 并通知父组件切换预览
 * @param cardId 版本卡片 id 或手动编辑 editId
 */
const handleSchemaVersionCardClick = (cardId: string) => {
  if (!cardId) {
    return;
  }

  const card = getMessageByCardId(cardId);
  if (!card) {
    return;
  }

  const schema = rebuildSchemaFromCard(card);
  if (!schema) {
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
    :type="type"
    :error-messages-map="errorMessagesMap"
    v-bind="schemaVersionCardProps"
    @card-select="handleSchemaVersionCardClick"
  />
</template>
