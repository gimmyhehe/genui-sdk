<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { CodeEditor, DiffEditor } from 'monaco-editor-vue3';
import { GenuiConfigProvider, GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose, iconTime } from '@opentiny/vue-icon';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import GenuiTemplateMobileSheet from './GenuiTemplateMobileSheet.vue';
import SchemaVersionHistoryPanel from './SchemaVersionHistoryPanel.vue';
import useTemplate from './useTemplate';
import { useIsMobile } from '../../use-mobile';
import { SCHEMA_JSON_DIFF_EDITOR_OPTIONS, useMonacoPlaygroundTheme } from './use-monaco-playground-theme';
import {
  findLatestSchemaCardInConversation,
  isRenderableSchema,
  rebuildSchemaFromCard,
  collectSchemaVersionHistory,
  groupSchemaVersionHistory,
  resolveSchemaVersionDiffOriginal,
  resolveSchemaVersionDiffModified,
  hasUnifiedDiffChanges,
} from './template-chat-utils';
import type { ISchemaVersionHistoryEntry } from './template-chat-utils/schema-version-history';
import viewSchemaIcon from '../../assets/images/view-schema.svg';
import { locale, t } from '../../i18n';

const { isMobile } = useIsMobile();

const TinyCloseIcon = iconClose();
const TinyIconTime = iconTime();

const {
  currentSchema,
  setCurrentSchema,
  setCurrentPreviewSchema,
  currentPreviewSchema,
  currentPreviewSchemaComplete,
  templateConversationState,
  currentCardId,
  currentConversationId,
  applySchemaFromMessages,
  appendManualSchemaVersion,
} = useTemplate();
const props = defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const monacoTheme = useMonacoPlaygroundTheme(() => props.theme);

const rendererSchema = computed(() => {
  const schema = currentPreviewSchema.value ?? currentSchema.value;
  return isRenderableSchema(schema) ? schema : null;
});

const rendererSchemaKey = computed(() => {
  const schema = rendererSchema.value as Record<string, unknown> | null;
  const componentName = schema?.componentName ?? 'schema';
  return `${currentCardId.value || 'preview'}-${String(componentName)}`;
});
const rendererPanelVisible = ref(true);
const schemaHistoryVisible = ref(false);
// schema 编辑器是否可见（移动端：底部抽屉；抽屉内先预览再可打开 JSON）
const schemaEditorVisible = ref(false);
const mobileSchemaJsonEditorOpen = ref(false);
const MOBILE_SHEET_DEFAULT_HEIGHT_VH = 64;
const MOBILE_SHEET_MIN_HEIGHT_VH = 42;
const MOBILE_SHEET_MAX_HEIGHT_VH = 92;
const mobileSheetHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragStartY = ref(0);
const mobileSheetDragStartHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragging = ref(false);
const currentConversationMessages = computed(() => {
  const conversationState = templateConversationState.value;
  return (
    conversationState?.conversations?.find((item: Conversation) => item.id === conversationState.currentId)?.messages ??
    []
  );
});

const latestSchemaCardId = computed(() => {
  return findLatestSchemaCardInConversation(currentConversationMessages.value)?.cardId ?? '';
});

/**
 * 判断 cardId 是否为当前会话最新 schema 版本
 * 兼容手动合并卡的 cardId 与最后一次 editId
 * @param cardId 版本卡片 id 或手动编辑 editId
 * @returns 是否为最新版本
 */
const isLatestSchemaVersionCard = (cardId: string) => {
  if (!cardId || !latestSchemaCardId.value) {
    return false;
  }
  if (cardId === latestSchemaCardId.value) {
    return true;
  }
  return flatSchemaVersionHistoryEntries.value.some((entry) => entry.isLatest && entry.cardId === cardId);
};

const schemaVersionHistoryGroups = computed(() => {
  // 从会话消息收集 schema 版本，按日期分组供历史面板展示
  const entries = collectSchemaVersionHistory(currentConversationMessages.value, {
    currentCardId: currentCardId.value,
    latestCardId: latestSchemaCardId.value,
  });
  return groupSchemaVersionHistory(entries);
});

/**
 * 扁平化历史分组，便于按 cardId 查找当前选中条目
 */
const flatSchemaVersionHistoryEntries = computed(() =>
  schemaVersionHistoryGroups.value.flatMap((group) => group.items),
);

/**
 * 当前预览版本对应的历史条目（含手动编辑的 editId）
 */
const currentHistoryEntry = computed(
  () => flatSchemaVersionHistoryEntries.value.find((entry) => entry.cardId === currentCardId.value) ?? null,
);

/**
 * 仅从历史记录面板选中时启用 diff 编辑器（点击聊天气泡卡片不走 diff）
 */
const schemaEditorDiffFromHistory = ref(false);

/**
 * diff 左侧：上一版 schema JSON 文本
 */
const schemaEditorDiffOriginal = computed(() => {
  const entry = currentHistoryEntry.value;
  if (!entry) {
    return '{}';
  }
  return resolveSchemaVersionDiffOriginal(entry, flatSchemaVersionHistoryEntries.value);
});

/**
 * diff 右侧：当前选中版 schema JSON 文本
 */
const schemaEditorDiffModified = computed(() => {
  const entry = currentHistoryEntry.value;
  if (!entry) {
    return schemaEditorText.value;
  }
  return resolveSchemaVersionDiffModified(entry);
});

/**
 * 是否以 Monaco diff 展示 schema 变更（有实际差异时）
 */
const schemaEditorShowDiffView = computed(() => {
  if (!schemaEditorDiffFromHistory.value || !currentHistoryEntry.value) {
    return false;
  }
  return hasUnifiedDiffChanges(schemaEditorDiffOriginal.value, schemaEditorDiffModified.value);
});

/**
 * 切换右侧 schema 版本历史面板显隐
 */
const toggleSchemaHistoryPanel = () => {
  schemaHistoryVisible.value = !schemaHistoryVisible.value;
};

/**
 * 关闭 schema 版本历史面板
 */
const closeSchemaHistoryPanel = () => {
  schemaHistoryVisible.value = false;
};

/**
 * 用户是否正在预览非最新的历史版本
 */
const isViewingHistoryVersion = ref(false);
const showReturnLatestButton = computed(
  () =>
    isViewingHistoryVersion.value &&
    !isHistoryVersionApplied.value &&
    Boolean(currentCardId.value && !isLatestSchemaVersionCard(currentCardId.value)),
);

/**
 * 未应用当前预览版本时显示「应用此版本」
 */
const showApplyVersionButton = computed(() => showReturnLatestButton.value && !isHistoryVersionApplied.value);

/**
 * 当前预览的历史版本是否已应用为生效 schema
 */
const isHistoryVersionApplied = ref(true);

/**
 * 预览历史版本但未应用时，编辑器修改仅更新 preview 不回写 currentSchema
 */
const isViewingHistoryWithoutApply = computed(() => showReturnLatestButton.value && !isHistoryVersionApplied.value);

/**
 * JSON 编辑器是否为只读（历史 diff 或未应用的非最新版本）
 */
const isSchemaEditorReadOnly = computed(() => schemaEditorDiffFromHistory.value || isViewingHistoryWithoutApply.value);

const schemaEditorText = ref('{}');
const schemaEditorBaseline = ref('{}');

/**
 * JSON 编辑器是否处于可编辑态（桌面内联 / 移动端 JSON 层）
 */
const isSchemaJsonEditorActive = computed(
  () => (schemaEditorVisible.value && !isMobile.value) || (isMobile.value && mobileSchemaJsonEditorOpen.value),
);

/**
 * 编辑器文本相对 baseline 是否有未保存修改
 * @returns 是否存在未保存的编辑
 */
const hasUnsavedSchemaEditorChanges = () => schemaEditorText.value !== schemaEditorBaseline.value;
const schemaEditorDirty = computed(() => isSchemaJsonEditorActive.value && hasUnsavedSchemaEditorChanges());
const schemaEditorSaveLoading = ref(false);

/**
 * 将编辑器文本与 baseline 同步为当前 preview schema
 */
const syncSchemaEditorBaseline = () => {
  if (currentPreviewSchema.value) {
    const text = JSON.stringify(currentPreviewSchema.value, null, 2);
    schemaEditorText.value = text;
    schemaEditorBaseline.value = text;
  } else {
    schemaEditorText.value = '{}';
    schemaEditorBaseline.value = '{}';
  }
};

/**
 * 丢弃未保存的 JSON 编辑，恢复 preview 到 baseline
 */
const revertUnsavedSchemaEditorChanges = () => {
  if (!hasUnsavedSchemaEditorChanges()) {
    return;
  }

  schemaEditorText.value = schemaEditorBaseline.value;

  try {
    const schema = JSON.parse(schemaEditorBaseline.value || '{}');
    setCurrentPreviewSchema(schema);
  } catch {
    syncSchemaEditorBaseline();
  }
};

/**
 * 编辑器输入变更时仅同步 preview；生效 schema 由保存或「应用此版本」提交
 * @param value JSON 编辑器当前文本
 */
const applySchemaEditorTextToPreview = (value: string) => {
  if (isSchemaEditorReadOnly.value) {
    return;
  }
  schemaEditorText.value = value;
  try {
    const schema = JSON.parse(value || '{}');
    setCurrentPreviewSchema(schema);
  } catch (error) {
    console.error('schemaEditor parse error ===>', error);
  }
};

const editorOptions = computed(() => {
  const readOnly = isSchemaEditorReadOnly.value;
  return {
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    folding: true,
    foldingHighlight: true,
    foldingStrategy: 'indentation',
    formatOnPaste: !readOnly,
    readOnly,
    domReadOnly: readOnly,
  };
});

/**
 * 切换桌面端内联 JSON 编辑器显隐；关闭时丢弃未保存修改
 */
const toggleSchemaEditor = () => {
  if (schemaEditorVisible.value) {
    revertUnsavedSchemaEditorChanges();
  } else if (!isMobile.value) {
    syncSchemaEditorBaseline();
  }
  schemaEditorVisible.value = !schemaEditorVisible.value;
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
  }
};

/**
 * 关闭 JSON 编辑器视图（桌面 / 移动端），并重置 diff 与抽屉状态
 */
const closeSchemaEditorView = () => {
  revertUnsavedSchemaEditorChanges();
  schemaEditorVisible.value = false;
  mobileSchemaJsonEditorOpen.value = false;
  schemaEditorDiffFromHistory.value = false;
  mobileSheetDragging.value = false;
  mobileSheetHeightVh.value = MOBILE_SHEET_DEFAULT_HEIGHT_VH;
};

/**
 * 关闭右侧 schema 预览区及关联编辑器
 */
const closeRendererPanel = () => {
  rendererPanelVisible.value = false;
  closeSchemaEditorView();
};

/**
 * 移动端抽屉遮罩点击：若 JSON 层已打开则先关闭并丢弃未保存修改
 */
const onMobileSheetMaskClick = () => {
  if (mobileSchemaJsonEditorOpen.value) {
    handleMobileJsonEditorOpen(false);
  }
};

/**
 * 移动端抽屉内打开 JSON 编辑器
 * @param open 是否打开 JSON 层
 */
const handleMobileJsonEditorOpen = (open: boolean) => {
  if (open) {
    syncSchemaEditorBaseline();
  } else {
    revertUnsavedSchemaEditorChanges();
  }
  mobileSchemaJsonEditorOpen.value = open;
};

const mobileSheetPanelStyle = computed(() => ({
  height: `${mobileSheetHeightVh.value}vh`,
}));

/**
 * 将移动端抽屉高度限制在允许范围内
 * @param heightVh 目标高度（vh）
 * @returns 钳制后的高度（vh）
 */
const clampMobileSheetHeight = (heightVh: number) =>
  Math.min(MOBILE_SHEET_MAX_HEIGHT_VH, Math.max(MOBILE_SHEET_MIN_HEIGHT_VH, heightVh));

/**
 * 移动端抽屉拖拽过程中更新面板高度
 * @param event touchmove 事件
 */
const handleMobileSheetDragMove = (event: TouchEvent) => {
  if (!mobileSheetDragging.value) {
    return;
  }
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  const deltaY = touch.clientY - mobileSheetDragStartY.value;
  const deltaVh = (deltaY / window.innerHeight) * 100;
  mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetDragStartHeightVh.value - deltaVh);
  event.preventDefault();
};

/**
 * 移除移动端抽屉拖拽相关的全局 touch 监听
 */
const removeMobileSheetDragListeners = () => {
  window.removeEventListener('touchmove', handleMobileSheetDragMove);
  window.removeEventListener('touchend', handleMobileSheetDragEnd);
  window.removeEventListener('touchcancel', handleMobileSheetDragEnd);
};

/**
 * 移动端抽屉拖拽结束：解除监听并钳制最终高度
 */
function handleMobileSheetDragEnd() {
  if (!mobileSheetDragging.value) {
    return;
  }
  mobileSheetDragging.value = false;
  removeMobileSheetDragListeners();
  mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetHeightVh.value);
}

/**
 * 移动端抽屉顶部拖拽条 touchstart：开始调整面板高度
 * @param event touchstart 事件
 */
const onMobileSheetGrabTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  mobileSheetDragging.value = true;
  mobileSheetDragStartY.value = touch.clientY;
  mobileSheetDragStartHeightVh.value = mobileSheetHeightVh.value;
  window.addEventListener('touchmove', handleMobileSheetDragMove, { passive: false });
  window.addEventListener('touchend', handleMobileSheetDragEnd);
  window.addEventListener('touchcancel', handleMobileSheetDragEnd);
};

/**
 * 历史面板选中条目：切换预览并打开 diff / 只读 JSON 编辑器
 * @param entry 选中的历史版本条目
 */
const handleHistoryEntrySelect = (entry: ISchemaVersionHistoryEntry) => {
  if (entry.isPending) {
    return;
  }

  const schema = rebuildSchemaFromCard(entry.cardMessage);
  if (!schema) {
    return;
  }

  schemaEditorDiffFromHistory.value = true;
  toggleSchemaVersion(schema, entry.cardId, { diffFromHistory: true });
  closeSchemaHistoryPanel();
  syncSchemaEditorBaseline();
  if (!isMobile.value) {
    schemaEditorVisible.value = true;
  } else {
    mobileSchemaJsonEditorOpen.value = true;
  }
};

/**
 * 切换预览的 schema 版本（聊天气泡或历史面板触发）
 * @param schema 切换后的可渲染 schema
 * @param cardId 版本卡片 id 或手动编辑 editId
 * @param options.diffFromHistory true 表示来自历史面板，启用 diff / 只读态
 */
const toggleSchemaVersion = (
  schema: Record<string, unknown>,
  cardId: string,
  options: { diffFromHistory?: boolean } = {},
) => {
  if (hasUnsavedSchemaEditorChanges()) {
    revertUnsavedSchemaEditorChanges();
  }
  rendererPanelVisible.value = true;
  currentCardId.value = cardId;
  schemaEditorDiffFromHistory.value = options.diffFromHistory ?? false;
  const isLatestVersion = isLatestSchemaVersionCard(cardId);
  isViewingHistoryVersion.value = !isLatestVersion;
  isHistoryVersionApplied.value = isLatestVersion;
  setCurrentPreviewSchema(schema);
  if (isLatestVersion) {
    setCurrentSchema(schema);
  }
  if (schemaEditorVisible.value || isMobile.value) {
    syncSchemaEditorBaseline();
  }
  // 移动端：先打开底部抽屉仅展示渲染预览；JSON 编辑器由抽屉内「查看 Schema」再打开
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
    schemaEditorVisible.value = true;
    mobileSheetHeightVh.value = MOBILE_SHEET_DEFAULT_HEIGHT_VH;
  }
};

/**
 * 将当前预览的历史版本应用为生效 schema，写入 schema-manual 卡片并退出 diff / 只读态
 */
const applyCurrentVersion = () => {
  if (!showApplyVersionButton.value) {
    return;
  }

  const schema = currentPreviewSchema.value;
  if (!schema || !isRenderableSchema(schema)) {
    return;
  }

  let prevSchema: Record<string, unknown> | undefined;
  const effectiveSchema = currentSchema.value;
  if (
    effectiveSchema &&
    typeof effectiveSchema === 'object' &&
    !Array.isArray(effectiveSchema) &&
    isRenderableSchema(effectiveSchema)
  ) {
    prevSchema = effectiveSchema as Record<string, unknown>;
  }

  const saved = appendManualSchemaVersion(schema, { prevSchema });
  if (!saved) {
    return;
  }

  isViewingHistoryVersion.value = false;
  isHistoryVersionApplied.value = true;
  schemaEditorDiffFromHistory.value = false;
  syncSchemaEditorBaseline();
};

/**
 * 保存 JSON 编辑器修改，生成 schema-manual 版本卡片
 */
const handleSaveSchemaEditor = async () => {
  if (!schemaEditorDirty.value || schemaEditorSaveLoading.value) {
    return;
  }
  let schema: Record<string, unknown>;
  try {
    const parsed = JSON.parse(schemaEditorText.value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return;
    }
    schema = parsed as Record<string, unknown>;
  } catch {
    return;
  }
  if (!isRenderableSchema(schema)) {
    return;
  }

  schemaEditorSaveLoading.value = true;
  try {
    let prevSchema: Record<string, unknown> | undefined;
    try {
      const parsedPrev = JSON.parse(schemaEditorBaseline.value || '{}');
      if (parsedPrev && typeof parsedPrev === 'object' && !Array.isArray(parsedPrev)) {
        prevSchema = parsedPrev as Record<string, unknown>;
      }
    } catch {
      prevSchema = undefined;
    }

    const saved = appendManualSchemaVersion(schema, { prevSchema });
    if (saved) {
      isViewingHistoryVersion.value = false;
      isHistoryVersionApplied.value = true;
      syncSchemaEditorBaseline();
      // 桌面端编辑时聊天区被隐藏，保存后关闭编辑器以便看到新卡片
      closeSchemaEditorView();
    }
  } finally {
    schemaEditorSaveLoading.value = false;
  }
};

/**
 * 恢复预览与生效 schema 为会话最新版本，并退出历史 diff 态
 */
const resetToLatestVersion = () => {
  const conversationState = templateConversationState.value;
  if (!conversationState) {
    return;
  }
  const currentConversation = conversationState.conversations.find(
    (item: Conversation) => item.id === conversationState.currentId,
  );
  applySchemaFromMessages(currentConversation?.messages, {
    clearIfMissing: !conversationState.loading,
  });
  isViewingHistoryVersion.value = false;
  isHistoryVersionApplied.value = true;
  // 回到最新版本后关闭 diff 模式
  schemaEditorDiffFromHistory.value = false;
  syncSchemaEditorBaseline();
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
  }
};

watch(schemaEditorVisible, (visible) => {
  if (visible && !isMobile.value && !hasUnsavedSchemaEditorChanges()) {
    syncSchemaEditorBaseline();
  }
});

watch(mobileSchemaJsonEditorOpen, (open) => {
  if (open && !hasUnsavedSchemaEditorChanges()) {
    syncSchemaEditorBaseline();
  }
});

watch(
  currentPreviewSchema,
  () => {
    if (schemaEditorShowDiffView.value || hasUnsavedSchemaEditorChanges()) {
      return;
    }
    if (isSchemaJsonEditorActive.value) {
      syncSchemaEditorBaseline();
    }
  },
  { deep: true },
);

/**
 * Esc 键关闭 JSON 编辑器：移动端先关 JSON 层，再关整个抽屉
 * @param event 键盘事件
 */
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (isMobile.value && schemaEditorVisible.value && mobileSchemaJsonEditorOpen.value) {
      handleMobileJsonEditorOpen(false);
      return;
    }
    if (isMobile.value) {
      if (schemaEditorVisible.value) {
        closeSchemaEditorView();
      }
      return;
    }
    if (schemaEditorVisible.value) {
      closeSchemaEditorView();
    }
  }
};

/**
 * 聊天气泡「重新生成」后清除历史预览态
 */
const onSchemaRefresh = () => {
  isViewingHistoryVersion.value = false;
  isHistoryVersionApplied.value = true;
  // 刷新重新生成后退出历史 diff 态
  schemaEditorDiffFromHistory.value = false;
};

watch(currentConversationId, () => {
  schemaEditorVisible.value = false;
  mobileSchemaJsonEditorOpen.value = false;
  schemaHistoryVisible.value = false;
  isViewingHistoryVersion.value = false;
  isHistoryVersionApplied.value = true;
  rendererPanelVisible.value = true;
  resetToLatestVersion();
});

watch(
  () => templateConversationState.value?.loading,
  (loading, prevLoading) => {
    if (prevLoading === true && loading === false) {
      resetToLatestVersion();
    }
  },
);

onMounted(() => {
  resetToLatestVersion();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  removeMobileSheetDragListeners();
});
</script>

<template>
  <div :class="['genui-schema-template', { 'is-mobile': isMobile }]">
    <div class="genui-schema-template-item chat-container">
      <!-- 桌面：打开内联编辑器时隐藏聊天；移动端：底部抽屉叠在聊天上，聊天保持挂载以便背后仍可见 -->
      <GenuiConfigProvider
        v-show="!schemaEditorVisible || isMobile"
        :theme="theme"
        :locale="locale"
        style="width: 100%; height: 100%"
      >
        <genui-template-chat
          class="genui-template-chat"
          @schema-version-toggle="toggleSchemaVersion"
          @schema-refresh="onSchemaRefresh"
        />
      </GenuiConfigProvider>
      <div class="schema-version-container" v-show="schemaEditorVisible && !isMobile">
        <div class="schema-version-container__header">
          <span class="schema-version-container__title">
            {{ schemaEditorShowDiffView ? 'Schema 变更对比' : 'SchemaJSON' }}
          </span>
          <div class="schema-version-container__header-actions">
            <tiny-button
              v-if="schemaEditorDirty && !isSchemaEditorReadOnly"
              type="primary"
              size="small"
              round
              :loading="schemaEditorSaveLoading"
              @click="handleSaveSchemaEditor"
            >
              保存
            </tiny-button>
            <tiny-button
              type="text"
              class="genui-schema-toolbar-close-btn"
              :icon="TinyCloseIcon"
              :aria-label="t('templateEditor.close')"
              @click="closeSchemaEditorView"
            />
          </div>
        </div>
        <div class="schema-version-container__editor">
          <!-- diff 需 DiffEditor；可编辑/只读共用 CodeEditor，通过 options.readOnly 切换 -->
          <diff-editor
            v-if="schemaEditorShowDiffView"
            :key="currentCardId"
            :original="schemaEditorDiffOriginal"
            :value="schemaEditorDiffModified"
            language="json"
            :theme="monacoTheme"
            :options="SCHEMA_JSON_DIFF_EDITOR_OPTIONS"
          />
          <code-editor
            v-else
            :key="`${currentCardId}-${isSchemaEditorReadOnly}`"
            :value="schemaEditorText"
            language="json"
            :theme="monacoTheme"
            :options="editorOptions"
            @update:value="applySchemaEditorTextToPreview"
          />
        </div>
      </div>
    </div>
    <genui-template-mobile-sheet
    v-if="isMobile"
    :visible="isMobile && schemaEditorVisible"
    :json-editor-open="mobileSchemaJsonEditorOpen"
    :panel-style="mobileSheetPanelStyle"
    :show-return-latest-button="showReturnLatestButton"
    :show-apply-version-button="showApplyVersionButton"
    :current-preview-schema="currentPreviewSchema"
    :current-preview-schema-complete="currentPreviewSchemaComplete"
    :schema-editor="schemaEditorText"
    :schema-editor-diff-mode="schemaEditorShowDiffView"
    :schema-editor-mount-key="currentCardId"
    :schema-editor-diff-original="schemaEditorDiffOriginal"
    :schema-editor-diff-modified="schemaEditorDiffModified"
    :editor-options="editorOptions"
    :playground-theme="theme"
    :view-schema-icon="viewSchemaIcon"
    :history-icon="TinyIconTime"
    :history-visible="schemaHistoryVisible"
    :history-groups="schemaVersionHistoryGroups"
    :close-icon="TinyCloseIcon"
    @update:json-editor-open="handleMobileJsonEditorOpen"
    @update:schema-editor="applySchemaEditorTextToPreview"
    @mask-click="onMobileSheetMaskClick"
    @grab-touch-start="onMobileSheetGrabTouchStart"
    @close="closeSchemaEditorView"
    @toggle-history="toggleSchemaHistoryPanel"
    @close-history="closeSchemaHistoryPanel"
    @history-select="handleHistoryEntrySelect"
    :schema-editor-dirty="schemaEditorDirty"
    :schema-editor-save-loading="schemaEditorSaveLoading"
    @apply-current-version="applyCurrentVersion"
    @reset-to-latest-version="resetToLatestVersion"
    @save-schema-editor="handleSaveSchemaEditor"
  />
  <template v-else>
    <div class="genui-schema-template-item renderer-container" v-if="rendererSchema && rendererPanelVisible">
      <GenuiConfigProvider :theme="theme" style="height: 100%; width: 100%">
        <div class="renderer-container-wrapper">
          <div class="top-button-group">
            <button type="button" class="schema-toggle-text" @click="toggleSchemaEditor">
              <img class="button-svg-icon" :src="viewSchemaIcon" alt="" />
              {{ schemaEditorShowDiffView ? t('templateEditor.viewChanges') : t('templateEditor.viewJson') }}
            </button>
            <div class="top-button-group-right">
              <tiny-button v-if="showReturnLatestButton" type="primary" round @click="resetToLatestVersion">
                {{ t('templateEditor.returnLatest') }}
              </tiny-button>
              <tiny-button v-if="showApplyVersionButton" round @click="applyCurrentVersion">
                {{ t('templateEditor.applyVersion') }}
              </tiny-button>
              <tiny-button
                type="text"
                class="genui-schema-toolbar-close-btn"
                :class="{ 'is-active': schemaHistoryVisible }"
                :icon="TinyIconTime"
                :aria-label="t('templateEditor.history')"
                :title="t('templateEditor.history')"
                @click="toggleSchemaHistoryPanel"
              />
              <tiny-button
                type="text"
                class="genui-schema-toolbar-close-btn"
                :icon="TinyCloseIcon"
                :aria-label="t('templateEditor.closePreview')"
                @click="closeRendererPanel"
              />
            </div>
          </div>
          <div class="schema-renderer-body">
            <schema-renderer
              :key="rendererSchemaKey"
              class="schema-renderer"
              :content="rendererSchema"
              :generating="false"
              :is-json-complete="true"
            />
            <schema-version-history-panel
              :visible="schemaHistoryVisible"
              :groups="schemaVersionHistoryGroups"
              :theme="theme"
              @close="closeSchemaHistoryPanel"
              @select="handleHistoryEntrySelect"
            />
          </div>
        </div>
      </GenuiConfigProvider>
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
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      position: relative;
      border-left: 1px solid rgb(232, 232, 232);

      .top-button-group {
        flex-shrink: 0;
        box-sizing: border-box;
        height: @schema-toolbar-height;
        min-height: @schema-toolbar-height;
        max-height: @schema-toolbar-height;
        border-bottom: 1px solid rgb(232, 232, 232);
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
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
          font: inherit;
          text-align: inherit;
          color: #191919;
          text-decoration: none;
          cursor: pointer;
          user-select: none;

          &:hover {
            color: #191919;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          &:focus-visible {
            outline: 2px solid #1890ff;
            outline-offset: 2px;
            border-radius: 4px;
          }
        }

        .top-button-group-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      }

      .schema-renderer-body {
        flex: 1;
        min-height: 0;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .schema-renderer {
        flex: 1;
        min-height: 0;
        padding: 20px;
        overflow: auto;
        box-sizing: border-box;
      }

      .genui-schema-toolbar-close-btn.is-active {
        color: #1677ff;
        background: rgba(22, 119, 255, 0.1);
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

.genui-schema-toolbar-close-btn {
  flex-shrink: 0;

  &.tiny-button {
    box-sizing: border-box;
    min-width: 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    color: #666;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      color: #191919;
      background: rgba(0, 0, 0, 0.06);
    }

    &:active {
      background: rgba(0, 0, 0, 0.08);
    }
  }
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

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__editor {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__editor :deep(.monaco-code-editor),
  &__editor :deep(.monaco-diff-editor) {
    flex: 1;
    min-height: 0;
  }
}
</style>
