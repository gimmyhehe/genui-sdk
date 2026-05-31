<script setup lang="ts">
import { computed } from 'vue';
import { TinyDropdown } from '@opentiny/vue';
import { locale, setLocale } from '../i18n';

const langOptions = [
  { label: '简体中文', value: 'zh_CN' },
  { label: 'English', value: 'en_US' },
];

const menuOptions = {
  options: langOptions,
  placement: 'top-start',
};

const currentLangLabel = computed(() => {
  const zhOption = langOptions[0];
  const enOption = langOptions[1];
  return locale.value === zhOption.value ? enOption.label : zhOption.label;
});

const itemClick = (payload: { itemData?: { value?: string } }) => {
  const value = payload?.itemData?.value;
  if (value) {
    setLocale(value);
  }
};
</script>

<template>
  <div class="language-switcher">
    <tiny-dropdown trigger="click" :menu-options="menuOptions" :title="currentLangLabel" @item-click="itemClick" />
  </div>
</template>

<style scoped>
.language-switcher :deep(.tiny-dropdown) {
  color: #191919;
  stroke: #808080;
}
</style>
