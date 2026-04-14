<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import SchemaVersionCard from './SchemaVersionCard.vue';

const props = defineProps<{
  itemProps: any;
  type: 'json-patch' | 'schema-card';
  prevSchema: string;
  errorMessagesMap: Map<string, string>;
}>();

const emit = defineEmits<{
  (event: 'schema-version-card-click', cardId: string): void;
}>();

const generating = computed(() => !props.itemProps?.generatedTime);

const genuiRendererProps = computed(() => ({
  ...props.itemProps,
  requiredCompleteFieldSelectors: props.itemProps?.requiredCompleteFieldSelectors || [],
  generating: generating.value,
  key: props.itemProps?.cardId,
}));

const handleSchemaVersionCardClick = (cardId: string) => {
  emit('schema-version-card-click', cardId);
};
</script>

<template>
  <div v-if="generating">
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
