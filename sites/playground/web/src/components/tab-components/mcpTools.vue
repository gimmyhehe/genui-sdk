<script setup>
import { ref } from 'vue';
import { TinyCollapse } from '@opentiny/vue';
import { AgentA2aPanel, McpServerPanel } from './index';

const activePanels = ref(['mcp', 'agent']);
</script>

<template>
  <div>
    <tiny-collapse v-model="activePanels">
      <McpServerPanel />
      <AgentA2aPanel />
    </tiny-collapse>
  </div>
</template>

<style scoped lang="less">
::deep(.tiny-collapse-item__header) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  border-bottom: none !important;
}

::deep(.tiny-collapse-item__content) {
  padding: 0 !important;
}
</style>
