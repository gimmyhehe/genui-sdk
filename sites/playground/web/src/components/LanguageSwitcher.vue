<script setup lang="ts">
import { computed } from 'vue';
import { TinyRadioGroup } from '@opentiny/vue';
import { t, locale, setLocale } from '../i18n';

const langOptions = [
  { label: 'zh_CN', text: '简体中文' },
  { label: 'en_US', text: 'English' },
];

const currentLang = computed({
  get: () => locale.value,
  set: (value: string) => setLocale(value),
});
</script>

<template>
  <div class="language-switcher" role="radiogroup" :aria-label="t('lang.switch')">
    <tiny-radio-group v-model="currentLang" :options="langOptions" />
  </div>
</template>

<style scoped>
.language-switcher :deep(.tiny-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
</style>
