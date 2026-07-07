<script setup lang="ts">
import { computed } from 'vue';
import { CodeEditor, DiffEditor } from 'monaco-editor-vue3';
import {
  SCHEMA_JSON_DIFF_EDITOR_OPTIONS,
  useMonacoPlaygroundTheme,
  type PlaygroundColorTheme,
} from './composables/use-monaco-playground-theme';
import { useTemplateSchema } from './composables/use-template-schema';
import { useSchemaEditor } from './composables/use-schema-editor';
import { useSchemaDiff } from './composables/use-schema-diff';

const props = withDefaults(defineProps<{
  theme: PlaygroundColorTheme | 'lite' | 'auto';
  layout?: 'panel' | 'sheet';
}>(), {
  layout: 'panel',
});

const monacoTheme = useMonacoPlaygroundTheme(() => props.theme);
const { currentCardId } = useTemplateSchema();
const {
  schemaEditorText,
  applyTextToPreview,
  editorOptions,
  isReadOnly,
} = useSchemaEditor();
const {
  schemaEditorShowDiffView,
  schemaEditorDiffOriginal,
  schemaEditorDiffModified,
} = useSchemaDiff();

const diffEditorKey = computed(() => {
  if (props.layout === 'sheet') {
    return currentCardId.value
      || `${schemaEditorDiffOriginal.value?.length}-${schemaEditorDiffModified.value?.length}`;
  }
  return currentCardId.value;
});

const codeEditorKey = computed(() => {
  if (props.layout === 'sheet') {
    return `${currentCardId.value}-${editorOptions.value.readOnly}`;
  }
  return `${currentCardId.value}-${isReadOnly.value}`;
});

const diffOriginal = computed(() => schemaEditorDiffOriginal.value || '{}');
const diffModified = computed(() => schemaEditorDiffModified.value || schemaEditorText.value);
</script>

<template>
  <div :class="['schema-json-editor', `schema-json-editor--${layout}`]">
    <diff-editor
      v-if="schemaEditorShowDiffView"
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
      :value="schemaEditorText"
      language="json"
      :theme="monacoTheme"
      :options="editorOptions"
      @update:value="applyTextToPreview"
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
