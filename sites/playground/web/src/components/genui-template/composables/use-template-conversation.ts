import { ref, shallowRef, computed } from 'vue';
import { useConversation, IndexedDBStrategy } from '@opentiny/genui-sdk-vue';
import { AIClient, type ChatMessage } from '@opentiny/tiny-robot-kit';
import { CustomModelProvider } from '../template-provider';
import { emitter } from '../template-chat-event-emitter';
import type { LLMConfig } from '../chat.types';
import {
  findLatestSchemaInConversation,
  repairAllStalePendingSchemaCards,
  normalizeManualSchemaSaveMessages,
} from '../template-chat-utils';
import { t } from '../../../i18n';

const conversationKit = shallowRef<ReturnType<typeof useConversation> | null>(null);
let templateProvider: CustomModelProvider | null = null;
let templateChatUrl = '';
let templateLlmConfig: LLMConfig = { model: '', temperature: 0.3 };
const isTemplateInit = ref(false);

export interface UseTemplateConversationOptions {
  url: string;
  llmConfig?: LLMConfig;
  onLoaded?: (messages: ChatMessage[] | undefined) => void;
}

export function useTemplateConversation(options?: UseTemplateConversationOptions) {
  if (!conversationKit.value && options?.url) {
    const { url, llmConfig, onLoaded } = options;
    templateChatUrl = url;
    templateLlmConfig = llmConfig || templateLlmConfig;

    templateProvider = new CustomModelProvider({
      url,
      llmConfig: llmConfig || { model: '', temperature: 0.3 },
      emitter,
    });

    const clientInstance = new AIClient({
      provider: 'custom',
      providerImplementation: templateProvider,
    });

    conversationKit.value = useConversation({
      client: clientInstance,
      autoSave: false,
      allowEmpty: true,
      storage: new IndexedDBStrategy('genui-ai-template', 'conversations', 'conversations-list'),
      events: {
        onReceiveData(data, messages, preventDefault) {
          messages.value.push(data as any);
          preventDefault();
        },
        onLoaded(conversations) {
          if (!conversations.length) {
            conversationKit.value!.createConversation(t('template.defaultTitle'));
            conversationKit.value!.saveConversations();
          }
          const loadedMessages = conversationKit.value!.getCurrentConversation()?.messages;
          const repairedPending = repairAllStalePendingSchemaCards(loadedMessages);
          const normalizedManual = normalizeManualSchemaSaveMessages(loadedMessages);
          if (repairedPending || normalizedManual) {
            conversationKit.value!.saveConversations();
          }
          onLoaded?.(loadedMessages);
        },
        onFinish(_data: any, context) {
          if (_data?.type === 'error') {
            context.messages.value.push({
              role: 'assistant',
              content: '',
              messages: [{ type: 'error-text', content: _data.error.message }],
            });
          }
          repairAllStalePendingSchemaCards(context.messages.value);
          conversationKit.value!.saveConversations();
        },
      },
    });

    isTemplateInit.value = true;
  }

  const messages = computed(() => conversationKit.value?.getCurrentConversation()?.messages ?? []);
  const templateConversationState = computed(() => conversationKit.value?.state);
  const currentConversationId = computed(() => conversationKit.value?.state.currentId);

  const templateSchemaList = computed(() => {
    if (!conversationKit.value) {
      return [];
    }

    return conversationKit.value.state.conversations.map((item) => {
      const schemaInfo = findLatestSchemaInConversation(item.messages);
      return {
        id: item.id,
        name: item.title,
        schema: schemaInfo?.schema ?? '',
      };
    });
  });

  const getTemplateChatBaseConfig = () => ({
    url: templateChatUrl,
    llmConfig: templateLlmConfig,
  });

  const changeLlmConfig = (llmConfig: LLMConfig) => {
    templateLlmConfig = llmConfig;
    templateProvider?.changeLlmConfig(llmConfig);
  };

  const saveConversations = () => {
    conversationKit.value?.saveConversations();
  };

  const createConversation = () => {
    if (!conversationKit.value) {
      return;
    }
    conversationKit.value.createConversation(t('template.defaultTitle'));
    saveConversations();
  };

  const switchConversation = (id: string) => {
    conversationKit.value?.switchConversation(id);
  };

  const deleteConversation = (id: string) => {
    if (!conversationKit.value) {
      return false;
    }

    const { state, deleteConversation: remove, saveConversations: save } = conversationKit.value;
    remove(id);
    save();
    return state.conversations.length === 0;
  };

  const updateConversationTitle = (id: string, title: string) => {
    if (!conversationKit.value) {
      return;
    }
    conversationKit.value.updateTitle(id, title);
    saveConversations();
  };

  const getMessageManager = () => conversationKit.value?.messageManager.value ?? null;

  const getCurrentConversation = () => conversationKit.value?.getCurrentConversation() ?? null;

  return {
    isTemplateInit,
    conversationKit,
    templateProvider,
    messages,
    templateConversationState,
    currentConversationId,
    templateSchemaList,
    getTemplateChatBaseConfig,
    changeLlmConfig,
    saveConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    getMessageManager,
    getCurrentConversation,
    setTemplateSchema: (schema: unknown) => {
      templateProvider?.setTemplateSchema(schema);
    },
  };
}
