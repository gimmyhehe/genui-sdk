<script setup lang="ts">
import { computed } from 'vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose, iconHelp } from '@opentiny/vue-icon';
import type { ISchemaVersionHistoryEntry } from './template-chat-utils/schema-version-history';

const props = defineProps<{
  visible: boolean;
  groups: Array<{ label: string; items: ISchemaVersionHistoryEntry[] }>;
  theme?: 'light' | 'dark' | 'lite' | 'auto';
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', entry: ISchemaVersionHistoryEntry): void;
}>();

const TinyCloseIcon = iconClose();
const TinyHelpIcon = iconHelp();

const isDark = computed(() => props.theme === 'dark');
</script>

<template>
  <Transition name="schema-history-panel">
    <aside
      v-if="visible"
      class="schema-version-history-panel"
      :class="{ 'is-dark': isDark }"
      role="complementary"
      aria-label="历史记录"
    >
      <header class="schema-version-history-panel__header">
        <div class="schema-version-history-panel__title-wrap">
          <h3 class="schema-version-history-panel__title">历史记录</h3>
          <span class="schema-version-history-panel__help" title="按时间查看并切换模板版本">
            <TinyHelpIcon />
          </span>
        </div>
        <tiny-button
          type="text"
          class="schema-version-history-panel__close"
          :icon="TinyCloseIcon"
          aria-label="关闭历史记录"
          @click="emit('close')"
        />
      </header>

      <div class="schema-version-history-panel__body">
        <template v-if="groups.length">
          <section
            v-for="group in groups"
            :key="group.label"
            class="schema-version-history-panel__section"
          >
            <div class="schema-version-history-panel__section-title">{{ group.label }}</div>
            <button
              v-for="entry in group.items"
              :key="entry.cardId"
              type="button"
              class="schema-version-history-panel__item"
              :class="{ 'is-active': entry.isCurrent, 'is-pending': entry.isPending }"
              @click="emit('select', entry)"
            >
              <div class="schema-version-history-panel__item-main">
                <div class="schema-version-history-panel__item-time">{{ entry.timeLabel }}</div>
                <div class="schema-version-history-panel__item-desc">{{ entry.description }}</div>
                <div class="schema-version-history-panel__item-author">
                  <span
                    class="schema-version-history-panel__author-dot"
                    :class="entry.authorType === 'user' ? 'is-user' : 'is-ai'"
                  />
                  <span class="schema-version-history-panel__author-name">{{ entry.authorLabel }}</span>
                </div>
              </div>
            </button>
          </section>
        </template>
        <div v-else class="schema-version-history-panel__empty">暂无版本记录</div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped lang="less">
.schema-version-history-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 42%);
  min-width: 260px;
  z-index: 12;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  border-left: 1px solid #e8e8e8;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;

  &.is-dark {
    background: #262626;
    border-left-color: #404040;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.35);

    .schema-version-history-panel__title {
      color: #f5f5f5;
    }

    .schema-version-history-panel__help {
      color: #8c8c8c;
    }

    .schema-version-history-panel__section-title {
      color: #8c8c8c;
    }

    .schema-version-history-panel__item {
      color: #f0f0f0;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      &.is-active {
        background: rgba(24, 144, 255, 0.2);
      }
    }

    .schema-version-history-panel__item-time {
      color: #69b1ff;
    }

    .schema-version-history-panel__item-desc,
    .schema-version-history-panel__author-name {
      color: #bfbfbf;
    }

    .schema-version-history-panel__empty {
      color: #8c8c8c;
    }
  }

  &__header {
    flex-shrink: 0;
    height: 64px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e8e8e8;
    box-sizing: border-box;
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: #191919;
  }

  &__help {
    display: inline-flex;
    align-items: center;
    color: #8c8c8c;
    font-size: 14px;

    :deep(svg),
    :deep(svg path) {
      fill: currentColor;
    }
  }

  &__close {
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 8px 16px;
  }

  &__section + &__section {
    margin-top: 16px;
  }

  &__section-title {
    padding: 0 8px 8px;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
    color: #8c8c8c;
  }

  &__item {
    width: 100%;
    margin: 0;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    text-align: left;
    cursor: pointer;
    box-sizing: border-box;
    transition: background-color 0.15s ease;
    display: block;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    &.is-active {
      background: #e6f4ff;
    }

    &.is-pending .schema-version-history-panel__item-desc {
      color: #8c8c8c;
    }
  }

  &__item-time {
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
    color: #1677ff;
  }

  &__item-desc {
    margin-top: 2px;
    font-size: 13px;
    line-height: 20px;
    color: #595959;
    word-break: break-word;
  }

  &__item-author {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__author-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &.is-user {
      background: #7c6beb;
    }

    &.is-ai {
      background: #4a9eff;
    }
  }

  &__author-name {
    font-size: 12px;
    line-height: 18px;
    color: #8c8c8c;
  }

  &__empty {
    padding: 24px 12px;
    text-align: center;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.schema-history-panel-enter-active,
.schema-history-panel-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.schema-history-panel-enter-from,
.schema-history-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
