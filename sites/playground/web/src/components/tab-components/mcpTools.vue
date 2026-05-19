<script setup>
import { ref, inject } from 'vue';
import { TinyCollapse, TinyCheckbox } from '@opentiny/vue';
import { AgentPanel, McpServerPanel, SkillPanel } from './tool-panels';

const playgroundContext = inject('playgroundContext');
const { chatConfig } = playgroundContext;

const activePanels = ref(['mcp', 'agent', 'skills']);

const updateAddToolCallContext = (value) => {
  chatConfig.addToolCallContext = value;
};

const updateShowThinkingResult = (value) => {
  chatConfig.showThinkingResult = value;
};
</script>

<template>
  <div>
    <tiny-collapse class="playground-tools" v-model="activePanels">
      <McpServerPanel />
      <AgentPanel />
      <SkillPanel />
    </tiny-collapse>
    <div class="tool-call-options">
      <tiny-checkbox :model-value="chatConfig.addToolCallContext" @update:model-value="updateAddToolCallContext">
        调用结果添加到上下文
      </tiny-checkbox>
    </div>
    <div class="tool-call-options">
      <tiny-checkbox :model-value="chatConfig.showThinkingResult" @update:model-value="updateShowThinkingResult">
        调用结果展示在界面中
      </tiny-checkbox>
    </div>
  </div>
</template>

<style scoped lang="less">
.tool-call-options {
  margin-top: 12px;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #595959;

  &:last-child {
    margin-bottom: 16px;
  }
}

:deep(.tiny-collapse) {
  border-bottom: none;

  .tiny-collapse-item {
    padding-bottom: 16px;

    &:first-of-type {
      border-top: none;
    }

    &:last-of-type {
      border-bottom: none;
    }

    .tiny-collapse-item__header {
      padding: 0;
      border-bottom: none;
    }

    .tiny-collapse-item__content {
      padding: 0 !important;
      border: none;
    }
  }
}
</style>
