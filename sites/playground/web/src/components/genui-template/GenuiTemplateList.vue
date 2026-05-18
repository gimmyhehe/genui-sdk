<script setup lang="ts">
import type { Conversation } from '@opentiny/tiny-robot-kit';
import { computed, ref, watch } from 'vue';
import { TinyModal, TinyCheckboxGroup } from '@opentiny/vue';
import useTemplate from './useTemplate';
import TemplateList from './TemplateList.vue';
import {
  HistoryTransferToolbar,
  downloadConversations,
  reconcileImportedConversationIds,
} from '../tab-components/history-transfer';

const emit = defineEmits(['switch-template']);

const { templateConversationState, switchTemplate, deleteTemplate, updateTemplateTitle, createTemplate, conversation } =
  useTemplate();

const selectedTemplateIds = ref<string[]>([]);
const selectionActive = ref(false);

const conversations = computed(() => templateConversationState.value?.conversations ?? []);

watch(selectionActive, (active) => {
  if (!active) {
    selectedTemplateIds.value = [];
  }
});

watch(
  () => conversations.value.map((c) => c.id),
  () => {
    const idSet = new Set(conversations.value.map((c) => c.id));
    selectedTemplateIds.value = selectedTemplateIds.value.filter((id) => idSet.has(id));
  },
);

const handleImportConversations = (imported: Conversation[]) => {
  if (!conversation) {
    return;
  }

  const reconciledImported = reconcileImportedConversationIds(conversation.state.conversations, imported);
  conversation.state.conversations.unshift(...reconciledImported);
  conversation.saveConversations();
};

const handleItemClick = (item: Conversation) => {
  switchTemplate(item.id);

  emit('switch-template', item);
};

const handleItemAction = (action: { id: string }, item: Conversation) => {
  if (action.id === 'export') {
    downloadConversations([item], 'genui-template');
    return;
  }

  if (action.id === 'delete') {
    deleteTemplate(item.id);
  }
};

const handleItemTitleChange = (id: string, title: string) => {
  updateTemplateTitle(id, title);
};

const handleAddItem = () => {
  createTemplate();
};

const handleBatchExport = () => {
  const idSet = new Set(selectedTemplateIds.value);
  const items = conversations.value.filter((c) => idSet.has(c.id));
  downloadConversations(items, 'genui-template');
};

const handleBatchDelete = () => {
  const ids = [...selectedTemplateIds.value];
  if (ids.length === 0) {
    return;
  }
  TinyModal.confirm(`确定删除选中的 ${ids.length} 个模板？`)
    .then((type: 'confirm' | 'cancel') => {
      if (type === 'cancel') {
        return;
      }
      for (const id of ids) {
        deleteTemplate(id);
      }
      selectedTemplateIds.value = [];
    });
};
</script>

<template>
  <div class="genui-template-list">
    <history-transfer-toolbar
      v-model:selection-active="selectionActive"
      :conversations="conversations"
      :selected-ids="selectedTemplateIds"
      @import-conversations="handleImportConversations"
      @batch-export="handleBatchExport"
      @batch-delete="handleBatchDelete"
    />
    <tiny-checkbox-group v-model="selectedTemplateIds">
      <template-list
        v-model:selected-ids="selectedTemplateIds"
        :selection-active="selectionActive"
        :list-data="conversations"
        :current-id="templateConversationState?.currentId ?? ''"
        @item-click="handleItemClick"
        @item-action="handleItemAction"
        @item-title-change="handleItemTitleChange"
        @add-item="handleAddItem"
      />
    </tiny-checkbox-group>
  </div>
</template>

<style scoped>
.genui-template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-schema-card {
  cursor: pointer;
}

.template-schema-card:hover {
  background-color: #fff;
  border-color: #808080;
}

.template-schema-card-active {
  background-color: #fff;
  border-color: #808080;
}

:deep(.history-transfer-toolbar__selection-toggle) {
  margin-left: 0;
}
</style>
