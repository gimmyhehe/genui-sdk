import { computed, ref } from 'vue';
import {
  resolveSchemaVersionDiffOriginal,
  resolveSchemaVersionDiffModified,
  hasUnifiedDiffChanges,
} from '../template-chat-utils';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateVersionControl } from './use-template-version-control';

const schemaEditorText = ref('{}');
const schemaEditorBaseline = ref('{}');
const schemaEditorSaveLoading = ref(false);

const isReadOnly = computed(() => {
  const { isDiffMode, showReturnLatestButton } = useTemplateVersionControl();
  return isDiffMode.value || showReturnLatestButton.value;
});

const schemaEditorDiffOriginal = computed(() => {
  const { currentHistoryEntry, flatSchemaVersionHistoryEntries } = useTemplateVersionControl();
  const entry = currentHistoryEntry.value;
  if (!entry) {
    return '{}';
  }
  return resolveSchemaVersionDiffOriginal(entry, flatSchemaVersionHistoryEntries.value);
});

const schemaEditorDiffModified = computed(() => {
  const { currentHistoryEntry } = useTemplateVersionControl();
  const entry = currentHistoryEntry.value;
  if (!entry) {
    return schemaEditorText.value;
  }
  return resolveSchemaVersionDiffModified(entry);
});

const schemaEditorShowDiffView = computed(() => {
  const { isDiffMode, currentHistoryEntry } = useTemplateVersionControl();
  if (!isDiffMode.value || !currentHistoryEntry.value) {
    return false;
  }
  return hasUnifiedDiffChanges(schemaEditorDiffOriginal.value, schemaEditorDiffModified.value);
});

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

const hasUnsavedChanges = () => schemaEditorText.value !== schemaEditorBaseline.value;

const syncBaseline = () => {
  const { currentPreviewSchema } = useTemplateSchema();
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
    useTemplateSchema().setCurrentPreviewSchema(schema);
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
    useTemplateSchema().setCurrentPreviewSchema(schema);
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

export function useSchemaEditor() {
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
    schemaEditorDiffOriginal,
    schemaEditorDiffModified,
    schemaEditorShowDiffView,
  };
}
