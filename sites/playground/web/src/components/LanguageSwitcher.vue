<script setup lang="ts">
import { computed } from 'vue';
import { TinyDropdown } from '@opentiny/vue';
import { locale, setLocale } from '../i18n';
import { iconLanguage } from '@opentiny/vue-icon';

const IconLanguage = iconLanguage();

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
    <tiny-dropdown
      trigger="click"
      :prefix-icon="IconLanguage"
      :show-icon="false"
      :menu-options="menuOptions"
      title=""
      @item-click="itemClick"
    />
  </div>
</template>

<style scoped>
.language-switcher :deep(.tiny-dropdown) {
  color: #191919;
  stroke: #808080;
}
.language-switcher :deep(.tiny-dropdown__prefix-inner svg) {
  fill: #191919;
}
</style>
