<script setup>
import { computed } from 'vue';
import { THEME_PREVIEW_COLOR_PRESETS } from './theme-colors';

const props = defineProps({
  themeVariant: {
    type: String,
    default: 'lite',
  },
  themeColors: {
    type: Object,
    default: () => ({}),
  },
});

const themeStyleVars = computed(() => {
  const preset = THEME_PREVIEW_COLOR_PRESETS[props.themeVariant] || THEME_PREVIEW_COLOR_PRESETS.lite;
  const colors = { ...preset, ...props.themeColors };

  return {
    '--preview-border': colors.previewBorder,
    '--preview-bg': colors.previewBg,
    '--sidebar-bg': colors.sidebarBg,
    '--main-bg': colors.mainBg,
    '--skeleton-bg': colors.skeletonBg,
    '--new-task-bg': colors.newTaskBg,
    '--bubble-border': colors.bubbleBorder,
    '--bubble-bg': colors.bubbleBg,
    '--sender-border': colors.senderBorder,
    '--sender-bg': colors.senderBg,
  };
});
</script>

<template>
  <div class="theme-card__preview" :style="themeStyleVars">
    <div class="theme-card__preview-body">
      <div class="theme-card__preview-sidebar">
        <div class="theme-card__preview-logo"></div>
        <div class="theme-card__preview-new-task"></div>
        <div class="theme-card__preview-tab"></div>
        <div class="theme-card__preview-tab"></div>
        <div class="theme-card__preview-tab"></div>
      </div>
      <div class="theme-card__preview-main">
        <div class="theme-card__preview-chat-header"></div>
        <div class="theme-card__preview-bubble">
          <div class="theme-card__preview-line theme-card__preview-line--long"></div>
          <div class="theme-card__preview-line"></div>
          <div class="theme-card__preview-line theme-card__preview-line--short"></div>
        </div>
        <div class="theme-card__preview-sender">
          <div class="theme-card__preview-input"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.theme-card__preview {
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--preview-border);
  min-height: 100px;
  background: var(--preview-bg);
}

.theme-card__preview-body {
  padding: 4px;
  display: flex;
  gap: 6px;
  min-height: 98px;
  align-items: stretch;
}

.theme-card__preview-sidebar {
  width: 34%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 4px;
  border-radius: 4px;
  background: var(--sidebar-bg);
}

.theme-card__preview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--main-bg);
  border-radius: 4px;
  padding: 4px;
}

.theme-card__preview-logo {
  height: 8px;
  width: 72%;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-new-task {
  height: 10px;
  border-radius: 4px;
  background: var(--new-task-bg);
  margin-bottom: 2px;
}

.theme-card__preview-tab {
  height: 7px;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-chat-header {
  height: 7px;
  width: 42%;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-bubble {
  border-radius: 6px;
  border: 1px solid var(--bubble-border);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 46px;
  background: var(--bubble-bg);
}

.theme-card__preview-line {
  height: 6px;
  border-radius: 999px;
  background: var(--skeleton-bg);
  width: 100%;
}

.theme-card__preview-line--long {
  width: 100%;
}

.theme-card__preview-line--short {
  width: 62%;
}

.theme-card__preview-input {
  height: 8px;
  width: 74%;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-sender {
  margin-top: auto;
  border-radius: 4px;
  border: 1px solid var(--sender-border);
  padding: 4px;
  background: var(--sender-bg);
  display: flex;
  justify-content: center;
}
</style>
