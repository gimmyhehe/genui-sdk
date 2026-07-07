<script setup lang="ts">
import { computed } from 'vue';
import { CodeEditor, DiffEditor } from 'monaco-editor-vue3';
import {
  SCHEMA_JSON_DIFF_EDITOR_OPTIONS,
  useMonacoPlaygroundTheme,
  type PlaygroundColorTheme,
} from './composables/use-monaco-playground-theme';
import { useTemplateContext } from './composables';

const props = withDefaults(defineProps<{
  theme: PlaygroundColorTheme | 'lite' | 'auto';
  layout?: 'panel' | 'sheet';
}>(), {
  layout: 'panel',
});

const monacoTheme = useMonacoPlaygroundTheme(() => props.theme);
const { schema, version, editor } = useTemplateContext();

const editorOptions = computed(() => {
  const readOnly = version.isEditorReadOnly.value;
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

const diffEditorKey = computed(() => {
  if (props.layout === 'sheet') {
    return schema.currentCardId.value
      || `${version.schemaEditorDiffOriginal.value?.length}-${version.schemaEditorDiffModified.value?.length}`;
  }
  return schema.currentCardId.value;
});

const codeEditorKey = computed(() =>
  `${schema.currentCardId.value}-${version.isEditorReadOnly.value}`,
);

const diffOriginal = computed(() => version.schemaEditorDiffOriginal.value || '{}');
const diffModified = computed(() => version.schemaEditorDiffModified.value || editor.schemaEditorText.value);

const handleTextUpdate = (value: string) => {
  editor.applyTextToPreview(value, version.isEditorReadOnly.value);
};
</script>

<template>
  <div :class="['schema-json-editor', `schema-json-editor--${layout}`]">
    <diff-editor
      v-if="version.schemaEditorShowDiffView"
      :key="diffEditorKey"
      :original="diffOriginal"
      :value="diffModified"
      language="json"
      :theme="monacoTheme"
      :options="SCHEMA_JSON_DIFF_EDITOR_OPTIONS"
    />
    <code-editor
      v-else
      :key="codeEditorKey"
      :value="editor.schemaEditorText"
      language="json"
      :theme="monacoTheme"
      :options="editorOptions"
      @update:value="handleTextUpdate"
    />
  </div>
</template>

<style scoped lang="less">
.schema-json-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.monaco-code-editor),
  :deep(.monaco-diff-editor) {
    flex: 1;
    min-height: 0;
  }
}
</style>
