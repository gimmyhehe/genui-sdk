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
  <div class="mcp-tools">
    <div class="mcp-tools__scroll">
      <div class="mcp-tools__scroll-inner">
        <tiny-collapse class="playground-tools" v-model="activePanels">
          <McpServerPanel />
          <AgentPanel />
          <SkillPanel />
        </tiny-collapse>
      </div>
    </div>
    <div class="mcp-tools__footer">
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
  </div>
</template>

<style scoped lang="less">
.mcp-tools {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.mcp-tools__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.mcp-tools__scroll-inner {
  padding: 0 24px;
}

.mcp-tools__footer {
  flex-shrink: 0;
  padding: 12px 24px 16px;
  background: var(--ti-base-color-bg, #fff);
}

.tool-call-options {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #595959;

  & + & {
    margin-top: 12px;
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
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .tiny-collapse-item__content {
      padding: 0 !important;
      border: none;
    }
  }
}
</style>
