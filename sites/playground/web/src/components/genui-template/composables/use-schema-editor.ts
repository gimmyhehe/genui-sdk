import { computed, ref } from 'vue';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateVersionControl } from './use-template-version-control';

const schemaEditorText = ref('{}');
const schemaEditorBaseline = ref('{}');
const schemaEditorSaveLoading = ref(false);

export function useSchemaEditor() {
  const { currentPreviewSchema, setCurrentPreviewSchema } = useTemplateSchema();
  const { isDiffMode, showReturnLatestButton } = useTemplateVersionControl();

  const isReadOnly = computed(() => isDiffMode.value || showReturnLatestButton.value);

  const hasUnsavedChanges = () => schemaEditorText.value !== schemaEditorBaseline.value;

  const syncBaseline = () => {
    if (currentPreviewSchema.value) {
      const text = JSON.stringify(currentPreviewSchema.value, null, 2);
      schemaEditorText.value = text;
      schemaEditorBaseline.value = text;
    } else {
      schemaEditorText.value = '{}';
      schemaEditorBaseline.value = '{}';
    }
  };

  const revertUnsavedChanges = () => {
    if (!hasUnsavedChanges()) {
      return;
    }

    schemaEditorText.value = schemaEditorBaseline.value;

    try {
      const schema = JSON.parse(schemaEditorBaseline.value || '{}');
      setCurrentPreviewSchema(schema);
    } catch {
      syncBaseline();
    }
  };

  const applyTextToPreview = (value: string) => {
    if (isReadOnly.value) {
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
    const readOnly = isReadOnly.value;
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

  const parseSchemaText = (text: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(text || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const parseEditorSchema = () => parseSchemaText(schemaEditorText.value);
  const parseBaselineSchema = () => parseSchemaText(schemaEditorBaseline.value);

  return {
    schemaEditorText,
    schemaEditorBaseline,
    schemaEditorSaveLoading,
    isReadOnly,
    hasUnsavedChanges,
    syncBaseline,
    revertUnsavedChanges,
    applyTextToPreview,
    editorOptions,
    parseEditorSchema,
    parseBaselineSchema,
  };
}
