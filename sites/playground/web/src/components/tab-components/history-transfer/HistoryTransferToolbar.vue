<template>
  <div class="history-transfer-toolbar">
    <tiny-button round size="small" :disabled="selectedIds.length === 0" @click="emit('batch-delete')">
      删除
    </tiny-button>
    <tiny-button round size="small" @click="triggerImport">导入</tiny-button>
    <tiny-dropdown
      border
      trigger="click"
      title="导出"
      size="small"
      round
      :hide-on-click="true"
      :disabled="conversations.length === 0"
      @button-click="exportAll"
      @item-click="handleExportItemClick"
    >
      <template #dropdown>
        <tiny-dropdown-menu>
          <tiny-dropdown-item
            label="导出全部记录"
            :disabled="conversations.length === 0"
            :item-data="exportItemAll"
          />
          <tiny-dropdown-item
            label="导出已选记录"
            :disabled="selectedIds.length === 0"
            :item-data="exportItemSelected"
          />
        </tiny-dropdown-menu>
      </template>
    </tiny-dropdown>
    <input
      ref="fileInputRef"
      class="history-transfer-toolbar__file-input"
      type="file"
      accept="application/json,.json"
      @change="handleImportFile"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  TinyNotify,
  TinyButton,
  TinyDropdown,
  TinyDropdownMenu,
  TinyDropdownItem,
} from '@opentiny/vue';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import { downloadConversations, parseConversationFile, reconcileImportedConversationIds } from './history-transfer';

const props = withDefaults(
  defineProps<{
    conversations: Conversation[];
    selectedIds?: string[];
  }>(),
  { selectedIds: () => [] },
);

const emit = defineEmits<{
  'import-conversations': [conversations: Conversation[]];
  'batch-export': [];
  'batch-delete': [];
}>();

type ExportMenuAction = 'all' | 'selected';

const exportItemAll = { action: 'all' as ExportMenuAction };
const exportItemSelected = { action: 'selected' as ExportMenuAction };

const fileInputRef = ref<HTMLInputElement | null>(null);

const notify = (type: 'success' | 'warning' | 'error', message: string) => {
  TinyNotify({
    type,
    message,
    position: 'top-right',
  });
};

const triggerImport = () => {
  fileInputRef.value?.click();
};

const exportAll = () => {
  if (props.conversations.length === 0) {
    notify('warning', '当前没有可导出的会话');
    return;
  }

  downloadConversations(props.conversations);
};

const handleExportItemClick = (payload: { itemData?: { action: ExportMenuAction } }) => {
  const action = payload?.itemData?.action;
  if (action === 'all') {
    exportAll();
    return;
  }
  if (action === 'selected') {
    if (props.selectedIds.length === 0) {
      return;
    }
    emit('batch-export');
  }
};

const handleImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  try {
    const importedConversations = await parseConversationFile(file);
    if (importedConversations.length === 0) {
      notify('warning', '未找到可导入的会话');
      return;
    }

    const reconciledImported = reconcileImportedConversationIds(props.conversations, importedConversations);
    emit('import-conversations', reconciledImported);
    notify('success', `已导入 ${reconciledImported.length} 条会话`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '导入失败';
    notify('error', message);
  } finally {
    input.value = '';
  }
};
</script>

<style lang="less" scoped>
.history-transfer-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  .tiny-button {
    margin-left: 0;
  }
}

.history-transfer-toolbar__file-input {
  display: none;
}
</style>
