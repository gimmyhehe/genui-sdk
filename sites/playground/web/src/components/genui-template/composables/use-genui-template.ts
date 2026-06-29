import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import {
  isRenderableSchema,
  rebuildSchemaFromCard,
  resolveSchemaVersionDiffOriginal,
  resolveSchemaVersionDiffModified,
  hasUnifiedDiffChanges,
} from '../template-chat-utils';
import type { ISchemaVersionHistoryEntry } from '../template-chat-utils/schema-version-history';
import { useIsMobile } from '../../../use-mobile';
import useTemplate from './use-template';
import { useSchemaVersionHistory } from './use-schema-version-history';
import { useSchemaEditor } from './use-schema-editor';
import { useMobileSheet } from './use-mobile-sheet';

export function useGenuiTemplate() {
  const { isMobile } = useIsMobile();
  const {
    currentSchema,
    setCurrentSchema,
    setCurrentPreviewSchema,
    currentPreviewSchema,
    currentCardId,
    currentConversationId,
    messages,
    templateConversationState,
    applySchemaFromMessages,
    appendManualSchemaVersion,
  } = useTemplate();

  const rendererPanelVisible = ref(true);
  const schemaEditorDiffFromHistory = ref(false);
  const isViewingHistoryVersion = ref(false);
  const isHistoryVersionApplied = ref(true);

  const {
    schemaHistoryVisible,
    allSchemaVersionHistoryEntries,
    schemaVersionHistoryGroups,
    isLatestSchemaVersionCard,
    flatSchemaVersionHistoryEntries,
    currentHistoryEntry,
    toggleSchemaHistoryPanel,
    closeSchemaHistoryPanel,
  } = useSchemaVersionHistory(messages, currentCardId);

  const showReturnLatestButton = computed(
    () =>
      isViewingHistoryVersion.value &&
      !isHistoryVersionApplied.value &&
      Boolean(currentCardId.value && !isLatestSchemaVersionCard(currentCardId.value)),
  );

  const showApplyVersionButton = computed(() => showReturnLatestButton.value && !isHistoryVersionApplied.value);

  const isViewingHistoryWithoutApply = computed(() => showReturnLatestButton.value && !isHistoryVersionApplied.value);

  const {
    schemaEditorVisible,
    mobileSchemaJsonEditorOpen,
    schemaEditorText,
    schemaEditorBaseline,
    schemaEditorSaveLoading,
    isSchemaEditorReadOnly,
    isSchemaJsonEditorActive,
    schemaEditorDirty,
    hasUnsavedSchemaEditorChanges,
    syncSchemaEditorBaseline,
    revertUnsavedSchemaEditorChanges,
    applySchemaEditorTextToPreview,
    editorOptions,
    toggleSchemaEditor,
    handleMobileJsonEditorOpen,
    onMobileSheetMaskClick,
  } = useSchemaEditor({
    isMobile,
    currentPreviewSchema,
    setCurrentPreviewSchema,
    isViewingHistoryWithoutApply,
    schemaEditorDiffFromHistory,
  });

  const schemaEditorDiffOriginal = computed(() => {
    const entry = currentHistoryEntry.value;
    if (!entry) {
      return '{}';
    }
    return resolveSchemaVersionDiffOriginal(entry, flatSchemaVersionHistoryEntries.value);
  });

  const schemaEditorDiffModified = computed(() => {
    const entry = currentHistoryEntry.value;
    if (!entry) {
      return schemaEditorText.value;
    }
    return resolveSchemaVersionDiffModified(entry);
  });

  const schemaEditorShowDiffView = computed(() => {
    if (!schemaEditorDiffFromHistory.value || !currentHistoryEntry.value) {
      return false;
    }
    return hasUnifiedDiffChanges(schemaEditorDiffOriginal.value, schemaEditorDiffModified.value);
  });

  const { mobileSheetPanelStyle, onMobileSheetGrabTouchStart, resetMobileSheetHeight } = useMobileSheet();

  const closeSchemaEditorView = () => {
    revertUnsavedSchemaEditorChanges();
    schemaEditorVisible.value = false;
    mobileSchemaJsonEditorOpen.value = false;
    schemaEditorDiffFromHistory.value = false;
    resetMobileSheetHeight();
  };

  const closeRendererPanel = () => {
    rendererPanelVisible.value = false;
    closeSchemaEditorView();
  };

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
    if (isMobile.value) {
      mobileSchemaJsonEditorOpen.value = false;
      schemaEditorVisible.value = true;
      resetMobileSheetHeight({ resetDragging: false });
    }
  };

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

  const selectSchemaVersionCard = (cardId: string) => {
    if (!cardId) {
      return;
    }
    currentCardId.value = cardId;
    schemaEditorDiffFromHistory.value = false;
  };

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

    const saved = appendManualSchemaVersion(schema, {
      prevSchema,
      sourceCardId: currentCardId.value,
      sourceCardGeneratedTime:
        currentHistoryEntry.value?.generatedTime ??
        allSchemaVersionHistoryEntries.value.find((entry) => entry.cardId === currentCardId.value)?.generatedTime,
      sourceCardInput:
        currentHistoryEntry.value?.input ??
        allSchemaVersionHistoryEntries.value.find((entry) => entry.cardId === currentCardId.value)?.input,
    });
    if (!saved) {
      return;
    }

    isViewingHistoryVersion.value = false;
    isHistoryVersionApplied.value = true;
    schemaEditorDiffFromHistory.value = false;
    syncSchemaEditorBaseline();
  };

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
        closeSchemaEditorView();
      }
    } finally {
      schemaEditorSaveLoading.value = false;
    }
  };

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
    schemaEditorDiffFromHistory.value = false;
    syncSchemaEditorBaseline();
    if (isMobile.value) {
      mobileSchemaJsonEditorOpen.value = false;
    }
  };

  const onSchemaRefresh = () => {
    isViewingHistoryVersion.value = false;
    isHistoryVersionApplied.value = true;
    schemaEditorDiffFromHistory.value = false;
  };

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
  });

  return {
    rendererPanelVisible,
    schemaHistoryVisible,
    schemaEditorVisible,
    mobileSchemaJsonEditorOpen,
    schemaVersionHistoryGroups,
    schemaEditorText,
    schemaEditorDiffOriginal,
    schemaEditorDiffModified,
    schemaEditorShowDiffView,
    toggleSchemaHistoryPanel,
    closeSchemaHistoryPanel,
    showReturnLatestButton,
    showApplyVersionButton,
    isSchemaEditorReadOnly,
    schemaEditorDirty,
    schemaEditorSaveLoading,
    applySchemaEditorTextToPreview,
    editorOptions,
    toggleSchemaEditor,
    closeSchemaEditorView,
    closeRendererPanel,
    onMobileSheetMaskClick,
    handleMobileJsonEditorOpen,
    mobileSheetPanelStyle,
    onMobileSheetGrabTouchStart,
    handleHistoryEntrySelect,
    toggleSchemaVersion,
    selectSchemaVersionCard,
    applyCurrentVersion,
    handleSaveSchemaEditor,
    resetToLatestVersion,
    onSchemaRefresh,
  };
}
