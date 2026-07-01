<script setup lang="ts">
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { useIsMobile } from '../../use-mobile';
import GenuiTemplateDesktop from './GenuiTemplateDesktop.vue';
import GenuiTemplateMobile from './GenuiTemplateMobile.vue';
import { locale } from '../../i18n';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue';

defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const { isMobile } = useIsMobile();
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
