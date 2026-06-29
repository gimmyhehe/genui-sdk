import { computed, ref, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue';

export function useSchemaEditor(options: {
  isMobile: Ref<boolean>;
  currentPreviewSchema: ShallowRef<unknown>;
  setCurrentPreviewSchema: (schema: unknown) => void;
  isViewingHistoryWithoutApply: ComputedRef<boolean>;
  schemaEditorDiffFromHistory: Ref<boolean>;
}) {
  const {
    isMobile,
    currentPreviewSchema,
    setCurrentPreviewSchema,
    isViewingHistoryWithoutApply,
    schemaEditorDiffFromHistory,
  } = options;

  const schemaEditorVisible = ref(false);
  const mobileSchemaJsonEditorOpen = ref(false);
  const schemaEditorText = ref('{}');
  const schemaEditorBaseline = ref('{}');
  const schemaEditorSaveLoading = ref(false);

  const isSchemaEditorReadOnly = computed(() => schemaEditorDiffFromHistory.value || isViewingHistoryWithoutApply.value);

  const isSchemaJsonEditorActive = computed(
    () => (schemaEditorVisible.value && !isMobile.value) || (isMobile.value && mobileSchemaJsonEditorOpen.value),
  );

  const hasUnsavedSchemaEditorChanges = () => schemaEditorText.value !== schemaEditorBaseline.value;
  const schemaEditorDirty = computed(() => isSchemaJsonEditorActive.value && hasUnsavedSchemaEditorChanges());

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

  const handleMobileJsonEditorOpen = (open: boolean) => {
    if (open) {
      syncSchemaEditorBaseline();
    } else {
      revertUnsavedSchemaEditorChanges();
    }
    mobileSchemaJsonEditorOpen.value = open;
  };

  const onMobileSheetMaskClick = () => {
    if (mobileSchemaJsonEditorOpen.value) {
      handleMobileJsonEditorOpen(false);
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

  return {
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
  };
}
