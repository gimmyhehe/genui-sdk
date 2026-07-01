import { computed } from 'vue';
import {
  resolveSchemaVersionDiffOriginal,
  resolveSchemaVersionDiffModified,
  hasUnifiedDiffChanges,
} from '../template-chat-utils';
import { useTemplateVersionControl } from './use-template-version-control';
import { useSchemaVersionHistory } from './use-schema-version-history';
import { useSchemaEditor } from './use-schema-editor';

export function useSchemaDiff() {
  const { isDiffMode } = useTemplateVersionControl();
  const { currentHistoryEntry, flatSchemaVersionHistoryEntries } = useSchemaVersionHistory();
  const { schemaEditorText } = useSchemaEditor();

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
    if (!isDiffMode.value || !currentHistoryEntry.value) {
      return false;
    }
    return hasUnifiedDiffChanges(schemaEditorDiffOriginal.value, schemaEditorDiffModified.value);
  });

  return {
    schemaEditorDiffOriginal,
    schemaEditorDiffModified,
    schemaEditorShowDiffView,
  };
}
