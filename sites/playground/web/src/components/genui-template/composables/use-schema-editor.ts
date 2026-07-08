import { ref } from 'vue';
import { useTemplateSchema } from './use-template-schema';

const schemaEditorText = ref('{}');
const schemaEditorBaseline = ref('{}');
const schemaEditorSaveLoading = ref(false);

export function useSchemaEditor() {
  const { currentPreviewSchema, setCurrentPreviewSchema } = useTemplateSchema();

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

  const applyTextToPreview = (value: string, readOnly = false) => {
    if (readOnly) {
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
    hasUnsavedChanges,
    syncBaseline,
    revertUnsavedChanges,
    applyTextToPreview,
    parseEditorSchema,
    parseBaselineSchema,
  };
}
