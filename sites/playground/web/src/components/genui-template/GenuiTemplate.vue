<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { CodeEditor } from 'monaco-editor-vue3';
import { GenuiConfigProvider, GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose } from '@opentiny/vue-icon';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import type { ISchemaCardMessageItem, IJsonPatchMessageItem } from './chat.types';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import useTemplate from './useTemplate';
import { useIsMobile } from '../../use-mobile';
import viewSchemaIcon from '../../assets/images/view-schema.svg';

const { isMobile } = useIsMobile();

const TinyCloseIcon = iconClose();

const { currentSchema, setCurrentSchema, templateConversationState, conversation, currentCardId } = useTemplate();
const props = defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

// 桌面：右侧预览列是否展开（关闭后仅占聊天列；切换会话或点击版本卡片会重新展开）
const rendererPanelVisible = ref(true);
// schema 编辑器是否可见（移动端：底部抽屉；抽屉内先预览再可打开 JSON）
const schemaEditorVisible = ref(false);
const mobileSchemaJsonEditorOpen = ref(false);
const latestSchemaCardId = computed(() => {
  const conversationState = templateConversationState.value;
  const currentConversation = conversationState?.conversations?.find(
    (item: Conversation) => item.id === conversationState.currentId,
  );
  const lastMessage = currentConversation?.messages?.[currentConversation.messages.length - 1] as IMessage | undefined;
  const schemaMessage = lastMessage?.messages?.find(
    (message): message is ISchemaCardMessageItem | IJsonPatchMessageItem =>
      message.type === 'schema-card' || message.type === 'json-patch',
  );

  return schemaMessage?.cardId ?? '';
});
// 仅当正在查看历史版本时显示“返回最新版本”
const showReturnLatestButton = computed(() => Boolean(currentCardId.value && latestSchemaCardId.value && currentCardId.value !== latestSchemaCardId.value));
// 编辑器中显示的代码
const schemaEditor = computed({
  get() {
    // 写入编辑器的代码
    if (!currentSchema.value) {
      schemaEditorVisible.value = false;
      return '{}';
    }

    return JSON.stringify(currentSchema.value, null, 2);
  },
  set(value: string) {
    // 在编辑器中编辑代码
    try {
      const schema = JSON.parse(value || '{}');

      setCurrentSchema(schema);
    } catch (error) {
      console.error('schemaEditor set error ===>', error);
    }
  },
});

const editorOptions = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  folding: true,
  foldingHighlight: true,
  foldingStrategy: 'indentation',
  formatOnPaste: true,
};

const toggleSchemaEditor = () => {
  schemaEditorVisible.value = !schemaEditorVisible.value;
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
  }
};

const closeSchemaEditorView = () => {
  schemaEditorVisible.value = false;
  mobileSchemaJsonEditorOpen.value = false;
};

const closeRendererPanel = () => {
  rendererPanelVisible.value = false;
  closeSchemaEditorView();
};

const onMobileSheetMaskClick = () => {
  if (mobileSchemaJsonEditorOpen.value) {
    mobileSchemaJsonEditorOpen.value = false;
    return;
  }
  closeSchemaEditorView();
};

const toggleSchemaVersion = (schema: Record<string, unknown>, cardId: string) => {
  rendererPanelVisible.value = true;
  currentCardId.value = cardId;
  schemaEditor.value = JSON.stringify(schema, null, 2);
  // 移动端：先打开底部抽屉仅展示渲染预览；JSON 编辑器由抽屉内「查看 Schema」再打开
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
    schemaEditorVisible.value = true;
  }
};

const resetToLatestVersion = () => {
  // 获取最新版本的 schema
  const conversationState = templateConversationState.value;
  if (!conversationState) {
    return;
  }
  const currentConversation = conversationState.conversations.find(
    (conversation: Conversation) => conversation.id === conversationState.currentId,
  );
  const lastMessage = currentConversation?.messages?.[currentConversation?.messages.length - 1] as IMessage | undefined;
  const schemaMessage = lastMessage?.messages?.find(
    (message): message is ISchemaCardMessageItem | IJsonPatchMessageItem =>
      message.type === 'schema-card' || message.type === 'json-patch',
  );
  const latestSchema = schemaMessage?.schema;
  currentCardId.value = schemaMessage?.cardId ?? '';
  if (latestSchema) {
    schemaEditor.value = JSON.stringify(JSON.parse(latestSchema), null, 2);
  }
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
  }
};

// 按 Esc：移动端先关 JSON 第二层，再关整个抽屉
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (isMobile.value && schemaEditorVisible.value && mobileSchemaJsonEditorOpen.value) {
      mobileSchemaJsonEditorOpen.value = false;
      return;
    }
    if (schemaEditorVisible.value) {
      closeSchemaEditorView();
    }
  }
};

const currentConversationId = computed(() => conversation?.state.currentId);

watch(currentConversationId, () => {
  schemaEditorVisible.value = false;
  mobileSchemaJsonEditorOpen.value = false;
  currentCardId.value = '';
  rendererPanelVisible.value = true;
});

onMounted(() => {
  resetToLatestVersion();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div :class="['genui-schema-template', { 'is-mobile': isMobile }]">
    <div class="genui-schema-template-item chat-container">
      <!-- 桌面：打开内联编辑器时隐藏聊天；移动端：底部抽屉叠在聊天上，聊天保持挂载以便背后仍可见 -->
      <GenuiConfigProvider v-show="!schemaEditorVisible || isMobile" :theme="theme" style="width: 100%; height: 100%">
        <genui-template-chat class="genui-template-chat" @schema-version-toggle="toggleSchemaVersion" />
      </GenuiConfigProvider>
      <div class="schema-version-container" v-show="schemaEditorVisible && !isMobile">
        <div class="schema-version-container__header">
          <span class="schema-version-container__title">查看 Schema</span>
          <button type="button" class="schema-version-container__close" aria-label="关闭" @click="closeSchemaEditorView">
            ×
          </button>
        </div>
        <div class="schema-version-container__editor">
          <code-editor v-model:value="schemaEditor" language="json" theme="vs" :options="editorOptions" />
        </div>
      </div>
    </div>
    <Teleport v-if="isMobile" to="body">
      <Transition name="schema-mobile-sheet">
        <div
          v-show="isMobile && schemaEditorVisible"
          class="schema-mobile-sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="mobileSchemaJsonEditorOpen ? 'Schema JSON 编辑器' : 'Schema 预览'"
        >
          <div class="schema-mobile-sheet__mask" @click="onMobileSheetMaskClick" />
          <div class="schema-mobile-sheet__panel">
            <div class="schema-mobile-sheet__grab" />
            <div class="schema-mobile-sheet__header">
              <div class="schema-mobile-sheet__header-start">
                <span
                  v-if="!mobileSchemaJsonEditorOpen"
                  class="schema-mobile-sheet__entry"
                  @click="mobileSchemaJsonEditorOpen = true"
                >
                  <img class="schema-mobile-sheet__entry-icon" :src="viewSchemaIcon" alt="" />
                  查看 Schema
                </span>
                <button
                  v-else
                  type="button"
                  class="schema-mobile-sheet__back"
                  @click="mobileSchemaJsonEditorOpen = false"
                >
                  返回预览
                </button>
              </div>
              <span class="schema-mobile-sheet__title">{{ mobileSchemaJsonEditorOpen ? 'JSON' : '预览' }}</span>
              <div class="schema-mobile-sheet__header-end">
                <tiny-button
                  v-if="showReturnLatestButton"
                  type="primary"
                  round
                  class="schema-mobile-sheet__latest-btn"
                  @click="resetToLatestVersion"
                >
                  返回最新版本
                </tiny-button>
                <tiny-button
                  type="text"
                  class="schema-mobile-sheet__close-btn"
                  :icon="TinyCloseIcon"
                  aria-label="关闭"
                  @click="closeSchemaEditorView"
                />
              </div>
            </div>
            <div class="schema-mobile-sheet__body">
              <div v-if="currentSchema" v-show="!mobileSchemaJsonEditorOpen" class="schema-mobile-sheet__preview schema-mobile-sheet__preview--solo">
                <schema-renderer class="schema-mobile-sheet-renderer" :content="currentSchema" :generating="false" />
              </div>
              <Transition name="schema-mobile-json">
                <div
                  v-show="mobileSchemaJsonEditorOpen"
                  class="schema-mobile-sheet__editor schema-mobile-sheet__editor--layer"
                >
                  <code-editor v-model:value="schemaEditor" language="json" theme="vs" :options="editorOptions" />
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <template v-if="!isMobile">
      <div class="genui-schema-template-item renderer-container" v-if="currentSchema && rendererPanelVisible">
        <div class="renderer-container-wrapper">
          <div class="top-button-group">
            <span class="schema-toggle-text" @click="toggleSchemaEditor">
              <img class="button-svg-icon" :src="viewSchemaIcon" alt="" />
              查看 Schema
            </span>
            <div class="top-button-group-right">
              <tiny-button v-if="showReturnLatestButton" type="primary" round
                @click="resetToLatestVersion">返回最新版本</tiny-button>
              <tiny-button
                type="text"
                class="renderer-toolbar-close-btn"
                :icon="TinyCloseIcon"
                aria-label="关闭预览区"
                @click="closeRendererPanel"
              />
            </div>
          </div>
          <schema-renderer class="schema-renderer" :content="currentSchema" :generating="false" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
@schema-toolbar-height: 64px;

.genui-schema-template {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;

  &-item {
    flex: 1;
    min-height: 0;
  }

  & .chat-container {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  & .renderer-container {
    overflow: auto;
    min-height: 0;
    box-sizing: border-box;

    &-wrapper {
      background-color: #ffffff;
      border-radius: 16px;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      text-align: center;
      position: relative;

      .top-button-group {
        flex-shrink: 0;
        box-sizing: border-box;
        height: @schema-toolbar-height;
        min-height: @schema-toolbar-height;
        max-height: @schema-toolbar-height;
        border-bottom: 1px solid rgb(232, 232, 232);
        border-left: 1px solid rgb(232, 232, 232);
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .button-svg-icon {
          width: 16px;
          height: 16px;
          margin-right: 6px;
          vertical-align: middle;
        }

        .schema-toggle-text {
          display: inline-flex;
          align-items: center;
          color: #191919;
          cursor: pointer;
          user-select: none;

          &:hover {
            color: #1890ff;
          }
        }

        .top-button-group-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .renderer-toolbar-close-btn {
          flex-shrink: 0;

          &:deep(.tiny-button) {
            min-width: auto;
            padding: 4px 6px;
            color: #666;
            border-radius: 8px;

            &:hover {
              color: #191919;
              background: rgba(0, 0, 0, 0.06);
            }
          }
        }
      }

      .schema-renderer {
        flex: 1;
        padding: 20px;
        overflow: auto;
        border-left: 1px solid rgb(232, 232, 232);
        box-sizing: border-box;
      }
    }
  }

  &.is-mobile {
    flex-direction: column-reverse;
    margin-bottom: 0;

    .genui-schema-template-item {
      flex: 1 1 50%;
      min-height: 0;
    }
  }
}


.genui-template-chat {
  width: 100%;
  min-height: 0;
}

.schema-version-container {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
  background: #fff;

  &__header {
    flex-shrink: 0;
    box-sizing: border-box;
    height: @schema-toolbar-height;
    min-height: @schema-toolbar-height;
    max-height: @schema-toolbar-height;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    border-bottom: 1px solid rgb(232, 232, 232);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: rgb(25, 25, 25);
    line-height: 22px;
  }

  &__close {
    margin: 0;
    padding: 4px 10px;
    border: none;
    background: transparent;
    font-size: 22px;
    line-height: 1;
    color: #666;
    cursor: pointer;
    border-radius: 8px;

    &:hover {
      color: #191919;
      background: rgba(0, 0, 0, 0.06);
    }
  }

  &__editor {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__editor :deep(.monaco-code-editor) {
    flex: 1;
    min-height: 0;
  }
}

.schema-mobile-sheet {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
  }

  &__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 48vh;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    transform: translateY(0);
  }

  &__grab {
    flex-shrink: 0;
    width: 36px;
    height: 4px;
    margin: 10px auto 6px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.12);
  }

  &__header {
    flex-shrink: 0;
    flex-grow: 0;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    max-height: 64px;
    padding: 8px 12px;
    border-bottom: 1px solid rgb(232, 232, 232);
    box-sizing: border-box;
    overflow: hidden;
  }

  &__header-start {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  &__header-end {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  &__latest-btn {
    flex-shrink: 1;
    min-width: 0;
    max-width: 50%;
  }

  &__entry {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    color: #191919;
    font-size: 14px;
    line-height: 22px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__entry-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &__back {
    margin: 0;
    padding: 6px 4px;
    border: none;
    background: transparent;
    font-size: 14px;
    line-height: 22px;
    color: #1890ff;
    cursor: pointer;
    white-space: nowrap;
  }

  &__title {
    flex: 0 0 auto;
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    color: #191919;
    white-space: nowrap;
  }

  &__close-btn {
    flex-shrink: 0;

    &:deep(.tiny-button) {
      min-width: auto;
      padding: 4px 8px;
      color: #666;
      border-radius: 8px;

      &:hover {
        color: #191919;
        background: rgba(0, 0, 0, 0.06);
      }

      &:active {
        background: rgba(0, 0, 0, 0.08);
      }
    }
  }

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    box-sizing: border-box;
  }

  &__preview {
    &--solo {
      flex: 1;
      min-height: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      background: #fafafa;
    }
  }

  &__editor {
    &--layer {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #fff;
      box-sizing: border-box;
    }
  }

  &-renderer {
    min-height: 120px;
    padding: 12px;
    box-sizing: border-box;
  }

  &__editor--layer :deep(.monaco-code-editor) {
    flex: 1;
    min-height: 0;
  }
}

.schema-mobile-json-enter-active,
.schema-mobile-json-leave-active {
  transition: opacity 0.2s ease, transform 0.22s ease;
}

.schema-mobile-json-enter-from,
.schema-mobile-json-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.schema-mobile-sheet-enter-active,
.schema-mobile-sheet-leave-active {
  transition: opacity 0.22s ease;

  .schema-mobile-sheet__panel {
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }
}

.schema-mobile-sheet-enter-from,
.schema-mobile-sheet-leave-to {
  opacity: 0;

  .schema-mobile-sheet__panel {
    transform: translateY(100%);
  }
}
</style>
