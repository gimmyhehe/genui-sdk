import { getTemplateStreamEvents, type TemplateStreamEvents } from './internal/template-stream-events';
import { inject, provide, reactive, type InjectionKey, type UnwrapNestedRefs } from 'vue';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateConversation } from './use-template-conversation';
import { useTemplateVersionControl } from './use-template-version-control';
import { useSchemaEditor } from './use-schema-editor';
import { useTemplateUi } from './use-template-ui';
import { useTemplateActions } from './use-template-actions';
import { useTemplateStreamRender } from './use-template-stream-render';

const asReactive = <T extends object>(obj: T): UnwrapNestedRefs<T> => reactive(obj) as UnwrapNestedRefs<T>;

export type TemplateContext = {
  schema: UnwrapNestedRefs<ReturnType<typeof useTemplateSchema>>;
  conversation: UnwrapNestedRefs<ReturnType<typeof useTemplateConversation>>;
  versionControl: UnwrapNestedRefs<ReturnType<typeof useTemplateVersionControl>>;
  editor: UnwrapNestedRefs<ReturnType<typeof useSchemaEditor>>;
  ui: UnwrapNestedRefs<ReturnType<typeof useTemplateUi>>;
  actions: UnwrapNestedRefs<ReturnType<typeof useTemplateActions>>;
  stream: ReturnType<typeof useTemplateStreamRender>;
  streamEvents: TemplateStreamEvents;
};

export const TemplateContextKey: InjectionKey<TemplateContext> = Symbol('TemplateContext');

let activeContext: TemplateContext | null = null;

export function createTemplateContext(): TemplateContext {
  const events = getTemplateStreamEvents();
  const schema = useTemplateSchema();
  const conversation = useTemplateConversation();
  const versionControl = useTemplateVersionControl();
  const editor = useSchemaEditor();
  const ui = useTemplateUi();
  const stream = useTemplateStreamRender();
  const actions = useTemplateActions({ versionControl, editor, ui });

  return {
    schema: asReactive(schema),
    conversation: asReactive(conversation),
    versionControl: asReactive(versionControl),
    editor: asReactive(editor),
    ui: asReactive(ui),
    actions: asReactive(actions),
    stream,
    streamEvents: events,
  };
}

export function ensureTemplateContext(): TemplateContext {
  if (!activeContext) {
    activeContext = createTemplateContext();
  }
  return activeContext;
}

export function provideTemplateContext(ctx?: TemplateContext) {
  const context = ctx ?? ensureTemplateContext();
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
