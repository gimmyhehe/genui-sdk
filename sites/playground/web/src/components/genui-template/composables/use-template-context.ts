import { inject, provide, type InjectionKey } from 'vue';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateConversation } from './use-template-conversation';
import { useTemplateVersionControl } from './use-template-version-control';
import { useSchemaEditor } from './use-schema-editor';
import { useTemplateUi } from './use-template-ui';
import { useTemplateActions } from './use-template-actions';

export interface TemplateContext {
  schema: ReturnType<typeof useTemplateSchema>;
  conversation: ReturnType<typeof useTemplateConversation>;
  version: ReturnType<typeof useTemplateVersionControl>;
  editor: ReturnType<typeof useSchemaEditor>;
  ui: ReturnType<typeof useTemplateUi>;
  actions: ReturnType<typeof useTemplateActions>;
}

export const TemplateContextKey: InjectionKey<TemplateContext> = Symbol('TemplateContext');

export function createTemplateContext(): TemplateContext {
  const schema = useTemplateSchema();
  const conversation = useTemplateConversation();
  const version = useTemplateVersionControl();
  const editor = useSchemaEditor();
  const ui = useTemplateUi();
  const actions = useTemplateActions({ version, editor, ui });

  return {
    schema,
    conversation,
    version,
    editor,
    ui,
    actions,
  };
}

export function provideTemplateContext(ctx?: TemplateContext) {
  const context = ctx ?? createTemplateContext();
  provide(TemplateContextKey, context);
  return context;
}

export function useTemplateContext() {
  const ctx = inject(TemplateContextKey);
  if (!ctx) {
    throw new Error('useTemplateContext must be used within GenuiTemplate');
  }
  return ctx;
}
