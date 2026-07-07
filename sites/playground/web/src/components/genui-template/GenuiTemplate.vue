<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { useIsMobile } from '../../use-mobile';
import GenuiTemplateDesktop from './GenuiTemplateDesktop.vue';
import GenuiTemplateMobile from './GenuiTemplateMobile.vue';
import { locale } from '../../i18n';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue';
import { provideTemplateContext } from './composables/use-template-context';
import { disposeMobileSheetDrag } from './composables/use-template-ui';

defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const { isMobile } = useIsMobile();
const { schema, conversation, actions } = provideTemplateContext();

watch(schema.currentPreviewSchemaComplete, (isComplete) => {
  if (isComplete && actions.shouldSyncEditorBaseline()) {
    actions.syncBaseline();
  }
});

watch(conversation.currentConversationId, actions.resetAll);

watch(
  () => conversation.templateConversationState.value?.loading,
  (loading, prevLoading) => {
    if (prevLoading === true && loading === false) {
      actions.resetToLatestVersion();
    }
  },
);

onMounted(() => {
  actions.resetToLatestVersion();
  window.addEventListener('keydown', actions.handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', actions.handleKeydown);
  disposeMobileSheetDrag();
});
</script>

<template>
  <GenuiConfigProvider
    :theme="theme"
    :locale="locale"
    :materials="materials"
    :renderer-config="rendererConfig"
    style="width: 100%; height: 100%"
  >
    <GenuiTemplateMobile v-if="isMobile" :theme="theme" />
    <GenuiTemplateDesktop v-else :theme="theme" />
  </GenuiConfigProvider>
</template>
