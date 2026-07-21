<script setup>
import { TinyTabs, TinyTabItem, TinyRadioGroup, TinyRadio, TinyCheckbox } from '@opentiny/vue';
import { iconPlus } from '@opentiny/vue-icon';
import { ref, watch, computed, inject, defineAsyncComponent, shallowRef } from 'vue';
import NewSvg from '../assets/images/new.svg?raw';
import OpenSvg from '../assets/images/open.svg?raw';
import CloseSvg from '../assets/images/close.svg?raw';
import MenuSvg from '../assets/images/menu.svg?raw';
import ModelConfig from './tab-components/ModelConfig.vue';
import McpTools from './tab-components/mcpTools.vue';
import GenuiHistory from './tab-components/GenuiHistory.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';
import { useIsMobile } from '../hooks';
import useTemplate from './genui-template/useTemplate';
import { ThemePreviewCard, THEME_PREVIEW_COLOR_PRESETS } from './theme-preview';
import { t } from '../i18n';

const props = defineProps({
  expanded: { type: Boolean, default: true },
  theme: { type: String, default: 'light' },
});

const emit = defineEmits(['update:expanded', 'new-task', 'update:theme', 'update-custom-examples']);

const { isTemplateInit, switchTemplate, createTemplate } = useTemplate();

const ENABLE_TEMPLATE = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';
// 条件异步加载 genui-template 组件，不启用时完全不导入，构建时不会被打包
const GenuiTemplateList = ENABLE_TEMPLATE
  ? defineAsyncComponent(() => import('./genui-template/GenuiTemplateList.vue'))
  : shallowRef(null);
// 从上层注入共享的 playground 上下文（framework / 会话等）
const playgroundContext = inject('playgroundContext');
const { conversation, framework } = playgroundContext;

const TinyIconPlus = iconPlus();
const activeName = ref('model');
const componentLib = ref('TinyVue');
const frameworkOptions = [
  { name: 'Vue', icon: 'V' },
  { name: 'Angular', icon: 'A' },
];
const componentLibOptions = ['TinyVue', 'ElementUI'];
const materialThemeOptions = [
  { text: '亮色', value: 'light' },
  { text: '暗黑', value: 'dark' },
  { text: '清新', value: 'lite' },
  { text: '跟随系统', value: 'auto' },
];
const materialThemeColorMap = {
  light: THEME_PREVIEW_COLOR_PRESETS.light,
  dark: THEME_PREVIEW_COLOR_PRESETS.dark,
  lite: THEME_PREVIEW_COLOR_PRESETS.lite,
};

const setFramework = (name) => {
  framework.value = name;
};

const { isMobile } = useIsMobile();

const currentConversationTitle = computed(() => {
  const current = conversation.value?.getCurrentConversation?.();
  return current?.title || t('sidebar.newConversation');
});

// 侧边栏宽度（使用样式中定义的 CSS 变量，避免重复）
const sidebarWidth = computed(() => (props.expanded ? 'var(--config-tas-width)' : 'var(--config-tas-width-collapsed)'));

const showNewTaskButton = computed(() => activeName.value !== 'template');

watch(isMobile, (mobile) => {
  if (mobile) emit('update:expanded', false);
});

const handleOverlayClick = () => {
  if (isMobile.value) emit('update:expanded', false);
};

const toggleExpanded = () => {
  emit('update:expanded', !props.expanded);
};

const handleNewTask = () => {
  emit('new-task');
  if (isMobile.value) emit('update:expanded', false);
};

const handleCreateNewTemplate = (id) => {
  activeName.value = 'template';
  if (id) {
    switchTemplate(id);
    return;
  }

  createTemplate();
};

const updateCustomExamples = (list) => {
  emit('update-custom-examples', list);
};
</script>

<template>
  <div class="playground-sidebar-root" :data-theme="theme">
    <!-- 顶部栏（仅移动端） -->
    <div v-if="isMobile" class="playground-topbar">
      <button
        type="button"
        class="playground-topbar__icon-btn"
        :aria-label="t('sidebar.openMenu')"
        @click="emit('update:expanded', true)"
      >
        <span class="svg-icon" :innerHTML="MenuSvg"></span>
      </button>
      <div class="playground-topbar__title">
        {{ currentConversationTitle }}
      </div>
      <button
        v-if="showNewTaskButton"
        type="button"
        class="playground-topbar__icon-btn"
        :aria-label="t('sidebar.newTask')"
        @click="handleNewTask"
      >
        <span class="svg-icon" :innerHTML="NewSvg"></span>
      </button>
    </div>

    <div
      class="playground-sidebar"
      :class="{
        'playground-sidebar--collapsed': !expanded && !isMobile,
        'playground-sidebar--mobile': isMobile,
        'playground-sidebar--mobile-open': isMobile && expanded,
      }"
      :style="{ width: isMobile ? 'min(100vw, var(--config-tas-width))' : sidebarWidth }"
    >
      <header
        class="playground-sidebar__header"
        :class="{ 'playground-sidebar__header--collapsed': !expanded && !isMobile }"
      >
        <div class="playground-sidebar__brand">
          <img src="/logo.svg" alt="logo" />
          <span v-if="expanded">GenUI</span>
        </div>

        <div class="playground-sidebar__actions">
          <div class="playground-sidebar__actions-inner">
            <button
              v-if="expanded"
              type="button"
              class="playground-sidebar__icon-btn"
              :aria-label="isMobile ? t('sidebar.closeSidebar') : t('sidebar.collapseSidebar')"
              :title="isMobile ? t('sidebar.close') : t('sidebar.collapseSidebar')"
              @click="emit('update:expanded', false)"
            >
              <span class="svg-icon" :innerHTML="CloseSvg" />
            </button>
            <button
              v-else
              type="button"
              class="playground-sidebar__icon-btn"
              :aria-label="t('sidebar.expandSidebar')"
              :title="t('sidebar.expand')"
              @click="toggleExpanded"
            >
              <span class="svg-icon" :innerHTML="OpenSvg" />
            </button>
          </div>
          <button
            v-if="!expanded && !isMobile && showNewTaskButton"
            type="button"
            class="playground-sidebar__icon-btn"
            :aria-label="t('sidebar.newTask')"
            :title="t('sidebar.newTask')"
            @click="handleNewTask"
          >
            <span class="svg-icon" :innerHTML="NewSvg" />
          </button>
        </div>
      </header>

      <div class="playground-sidebar__new-task">
        <button v-if="expanded && showNewTaskButton" class="new-task-btn" type="button" @click="handleNewTask">
          <TinyIconPlus :size="16" />
          <span class="new-task-btn__text">{{ t('sidebar.newTask') }}</span>
          <div class="new-task-btn__shortcut">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </button>
      </div>

      <tiny-tabs
        class="playground-sidebar__tabs"
        :class="{ 'playground-sidebar__tabs--tools': activeName === 'tools' }"
        v-model="activeName"
        v-show="expanded"
      >
        <tiny-tab-item :title="t('sidebar.tabModel')" name="model">
          <ModelConfig @createNewTemplate="handleCreateNewTemplate" @update-custom-examples="updateCustomExamples" />
        </tiny-tab-item>
        <tiny-tab-item :title="t('sidebar.tabTools')" name="tools">
          <McpTools />
        </tiny-tab-item>
        <tiny-tab-item title="物料" name="theme">
          <div class="config-title">框架</div>
          <div class="framework-group">
            <div
              v-for="item in frameworkOptions"
              :key="item.name"
              class="framework-btn"
              :class="{ 'framework-btn--active': framework === item.name }"
              @click="setFramework(item.name)"
              role="button"
              tabindex="0"
              @keydown.enter="setFramework(item.name)"
              @keydown.space.prevent="setFramework(item.name)"
            >
              <span class="framework-btn__icon">{{ item.icon }}</span>
              <span class="framework-btn__name">{{ item.name }}</span>
            </div>
          </div>

          <div class="config-title">组件库</div>
          <div class="library-radio-group" role="radiogroup" aria-label="组件库">
            <tiny-radio-group v-model="componentLib" class="library-radio-group__inner">
              <tiny-radio v-for="item in componentLibOptions" :key="item" :label="item">{{ item }}</tiny-radio>
            </tiny-radio-group>
          </div>

          <div class="config-title">主题</div>
          <div class="theme-card-group" role="radiogroup" aria-label="主题">
            <div
              v-for="item in materialThemeOptions"
              :key="item.value"
              class="theme-card-item"
            >
              <div
                class="theme-card"
                :class="[ `theme-card--${item.value}`, { 'theme-card--active': theme === item.value } ]"
                role="radio"
                :aria-checked="theme === item.value"
                tabindex="0"
                @click="emit('update:theme', item.value)"
                @keydown.enter="emit('update:theme', item.value)"
                @keydown.space.prevent="emit('update:theme', item.value)"
              >
                <tiny-checkbox
                  v-if="theme === item.value"
                  class="theme-card__check"
                  :model-value="true"
                  @click.stop
                />
                <ThemePreviewCard
                  :theme-variant="item.value"
                  :theme-colors="materialThemeColorMap[item.value]"
                />
              </div>
              <span
                class="theme-card__label"
                :class="{ 'theme-card__label--active': theme === item.value }"
              >
                {{ item.text }}
              </span>
            </div>
          </div>
        </tiny-tab-item>
        <tiny-tab-item :title="t('sidebar.tabHistory')" name="history" class="history-tab">
          <GenuiHistory v-if="conversation" :conversation="conversation" />
        </tiny-tab-item>
        <tiny-tab-item v-if="ENABLE_TEMPLATE && isTemplateInit" :title="t('sidebar.tabTemplate')" name="template">
          <component v-if="GenuiTemplateList" :is="GenuiTemplateList" />
        </tiny-tab-item>
      </tiny-tabs>

      <footer v-show="expanded" class="playground-sidebar__footer">
        <LanguageSwitcher />
      </footer>
    </div>

    <!-- 移动端遮罩层 -->
    <div v-if="isMobile && expanded" class="playground-sidebar__overlay" @click="handleOverlayClick" />

    <!-- 主内容区 -->
    <div class="playground-sidebar__main">
      <slot :activeName="activeName" />
    </div>
  </div>
</template>

<style scoped lang="less">
.playground-sidebar-root {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.playground-sidebar {
  --config-tas-width: 370px;
  --config-tas-width-collapsed: 48px;
  position: relative;
  height: 100%;
  box-sizing: border-box;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  z-index: 1001;
  background: var(--ti-base-color-bg, #fff);

  &--mobile {
    position: fixed;
    left: 0;
    top: 0;
    max-width: 100vw;
    height: 100%;
    height: 100dvh;
    transform: translateX(-100%);
    z-index: 1002;

    &.playground-sidebar--mobile-open {
      transform: translateX(0);
      box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;

    &--collapsed {
      flex-direction: column;
      gap: 20px;
      padding: 12px 8px 0;
    }
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 16px;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 20px;

    &-inner {
      display: flex;
      align-items: center;
    }
  }

  &__new-task {
    padding: 20px 24px 10px;
  }

  &__tabs {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .config-title {
      font-size: 14px;
      color: #595959;
      margin-bottom: 12px;
      margin-top: 16px;
      line-height: 32px;
    }
    :deep(.tiny-button-group .tiny-group-item li button) {
      padding: 0 20px;
    }

    .framework-group {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .framework-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 0;
      border: 1px solid #e6e6e6;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
    }

    .framework-btn__icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      font-weight: 600;
      font-size: 14px;
    }

    .framework-btn__name {
      font-size: 12px;
      line-height: 1;
      color: #595959;
    }

    .framework-btn--active {
      border-color: #191919;
      background: transparent;
    }

    .framework-btn--active .framework-btn__icon {
      background: #1476ff;
      color: #fff;
    }

    .framework-btn--active .framework-btn__name {
      color: #1476ff;
    }

    .library-radio-group {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }

    :deep(.library-radio-group__inner) {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .theme-card-group {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
      box-sizing: border-box;
    }

    .theme-card-item {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      min-width: 0;
      box-sizing: border-box;
    }

    .theme-card {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #e6e6e6;
      border-radius: 8px;
      padding: 8px 8px 0;
      cursor: pointer;
      user-select: none;
      overflow: hidden;
    }

    .theme-card__check {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 1;
      pointer-events: none;

      :deep(.tiny-checkbox) {
        margin: 0;
      }

      :deep(.tiny-checkbox__label) {
        display: none;
      }
    }

    .theme-card__label {
      font-size: 12px;
      line-height: 1;
      color: #595959;
      text-align: center;
    }

    .theme-card__label--active {
      color: #191919;
      font-weight: 500;
    }

    .theme-card--active {
      border-color: #191919;
    }

    :deep(.tiny-tabs__header.is-top) {
      padding: 0 24px;
      flex-shrink: 0;
    }

    :deep(.tiny-tabs__content) {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 0 24px 0;
    }

    &--tools :deep(.tiny-tabs__content) {
      overflow: hidden;
      padding: 0;
      display: flex;
      flex-direction: column;

      > .tiny-tab-pane {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
    }
  }

  &__footer {
    flex-shrink: 0;
    padding: 12px 24px 24px;
    border-top: 1px solid #f0f0f0;
  }

  .svg-icon {
    cursor: pointer;
  }
}

.new-task-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 36px;
  border: 1px solid #c2c2c2;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  background: transparent;
  appearance: none;
  font: inherit;

  &:focus-visible {
    outline: 2px solid #1677ff;
    outline-offset: 2px;
  }

  &__text {
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    text-align: justify;
  }

  &__shortcut {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;

    span {
      font-size: 10px;
      line-height: 14px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      padding: 0 6px;
      background: #fafafa;
    }
  }

  &:hover {
    background: #0000000a;
  }

  &.collapsed {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;
  }
}

.playground-sidebar__main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.playground-topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f0f0;
  padding: 8px 12px;
  z-index: 2;
}

.playground-topbar:after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -16px;
  height: 16px;
  background: linear-gradient(to bottom, #f0f0f0, transparent);
  pointer-events: none;
}

.playground-sidebar__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;

  &:focus-visible {
    outline: 2px solid #1677ff;
    outline-offset: 2px;
    border-radius: 8px;
  }
}

.playground-topbar__title {
  flex: 1;
  padding: 0 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #191919;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-topbar__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: #595959;

  .svg-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 暗黑主题下的移动端顶部栏 */
.playground-sidebar-root[data-theme='dark'] {
  .playground-topbar {
    background: #191919;
  }

  .playground-topbar:after {
    background: linear-gradient(to bottom, #191919, transparent);
  }

  .playground-topbar__title {
    color: #e6e6e6;
  }

  .playground-topbar__icon-btn {
    color: #d9d9d9;
  }
}

.playground-topbar {
  :deep(svg) {
    fill: currentColor;
  }
}

.playground-sidebar__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1001;
  opacity: 0;
  animation: sidebar-fade-in 0.3s ease forwards;
  cursor: pointer;
}

@keyframes sidebar-fade-in {
  to {
    opacity: 1;
  }
}

@media (min-width: 769px) {
  .playground-sidebar-root {
    flex-direction: row;
  }
}
</style>
