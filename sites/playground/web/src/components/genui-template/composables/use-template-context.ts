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
  return {
    schema: useTemplateSchema(),
    conversation: useTemplateConversation(),
    version: useTemplateVersionControl(),
    editor: useSchemaEditor(),
    ui: useTemplateUi(),
    actions: useTemplateActions(),
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
    return createTemplateContext();
  }
  return ctx;
}
