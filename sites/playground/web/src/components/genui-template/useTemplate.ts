import { ref, shallowRef, computed } from 'vue';
import { useConversation, IndexedDBStrategy } from '@opentiny/genui-sdk-vue';
import { AIClient, type ChatMessage } from '@opentiny/tiny-robot-kit';
import { CustomModelProvider } from './template-provider';
import type { LLMConfig, ISchemaManualMessageItem, ISchemaManualEditRecord } from './chat.types';
import { formatDate, generateId } from '../../utils';
import {
  findLatestSchemaInConversation,
  resolveRenderableSchemaFromMessages,
  findSchemaCardByCardId,
  findManualCardInMessages,
  getMergeableManualSaveMessage,
  getManualEdits,
  syncManualCardLatestFields,
  manualEditToCardSnapshot,
  repairAllStalePendingSchemaCards,
  normalizeManualSchemaSaveMessages,
} from './template-chat-utils';
import { t } from '../../i18n';

const conversation = shallowRef<ReturnType<typeof useConversation> | null>(null);
let templateProvider: CustomModelProvider | null = null;
let templateChatUrl = '';
let templateLlmConfig: LLMConfig = { model: '', temperature: 0.3 };
const isTemplateInit = ref(false);
const currentSchema = shallowRef<any>(null);
const currentPreviewSchema = shallowRef<any>(null);
const currentPreviewSchemaComplete = ref(true);
const currentCardId = ref<string>('');

function applySchemaFromMessages(
  messages: ChatMessage[] | undefined,
  options: { clearIfMissing?: boolean } = {},
) {
  const { clearIfMissing = true } = options;
  const latestSchemaInfo = findLatestSchemaInConversation(messages);

  if (latestSchemaInfo) {
    const resolved = resolveRenderableSchemaFromMessages(messages);
    if (resolved) {
      currentSchema.value = resolved.schema;
      currentPreviewSchema.value = resolved.schema;
      currentPreviewSchemaComplete.value = true;
      templateProvider?.setTemplateSchema(resolved.schema);
      currentCardId.value = resolved.cardId;
      return true;
    }
  }

  if (clearIfMissing) {
    currentSchema.value = null;
    currentPreviewSchema.value = null;
    currentCardId.value = '';
  }

  return false;
}

export interface UseTemplateOptions {
  url: string;
  llmConfig?: LLMConfig;
}

export default function useTemplate(options?: UseTemplateOptions) {
  if (!conversation.value && options?.url) {
    const { url, llmConfig } = options;
    templateChatUrl = url;
    templateLlmConfig = llmConfig || templateLlmConfig;

    templateProvider = new CustomModelProvider({
      url,
      llmConfig: llmConfig || { model: '', temperature: 0.3 },
    });

    const clientInstance = new AIClient({
      provider: 'custom',
      providerImplementation: templateProvider,
    });

    conversation.value = useConversation({
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
            conversation.value!.createConversation(t('template.defaultTitle'));
            conversation.value!.saveConversations();
          }
          const loadedMessages = conversation.value!.getCurrentConversation()?.messages;
          const repairedPending = repairAllStalePendingSchemaCards(loadedMessages);
          const normalizedManual = normalizeManualSchemaSaveMessages(loadedMessages);
          if (repairedPending || normalizedManual) {
            conversation.value!.saveConversations();
          }
          // IndexedDB 加载完成后再恢复 schema，避免早于 GenuiTemplate onMounted 的空窗期
          applySchemaFromMessages(loadedMessages);
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
          conversation.value!.saveConversations();
        },
      },
    });

    isTemplateInit.value = true;
  }

  const messages = computed(() => conversation.value?.getCurrentConversation()?.messages ?? []);
  const templateConversationState = computed(() => conversation.value?.state);
  const currentConversationId = computed(() => conversation.value?.state.currentId);


  const changeLlmConfig = (llmConfig: LLMConfig) => {
    templateProvider.changeLlmConfig(llmConfig);
  };


  const setCurrentPreviewSchema = (schema: any, isComplete: boolean = true) => {
    currentPreviewSchema.value = schema;
    if (isComplete !== currentPreviewSchemaComplete.value) {
      currentPreviewSchemaComplete.value = isComplete;
    }
  };


  const setCurrentSchema = (schema: any) => {
    currentSchema.value = schema;
    templateProvider.setTemplateSchema(schema);
  };


  const createTemplate = () => {
    if (!conversation.value) {
      return;
    }

    const { createConversation, saveConversations } = conversation.value;
    createConversation(t('template.defaultTitle'));
    saveConversations();
    setCurrentSchema(null);
    setCurrentPreviewSchema(null);
  };


  const switchTemplate = (id: string) => {
    if (!conversation.value) {
      return;
    }

    conversation.value.switchConversation(id);
    const currentConversation = conversation.value.getCurrentConversation();

    if (!currentConversation?.messages.length) {
      setCurrentSchema(null);
      setCurrentPreviewSchema(null);
      setCurrentCardId('');

      return;
    }

    applySchemaFromMessages(currentConversation.messages);
  };


  const deleteTemplate = (id: string) => {
    if (!conversation.value) {
      return;
    }

    const { state, deleteConversation, saveConversations } = conversation.value;

    deleteConversation(id);
    saveConversations();

    if (state.conversations.length === 0) {
      createTemplate();
    }
  };


  const updateTemplateTitle = (id: string, title: string) => {
    if (!conversation.value) {
      return;
    }

    const { updateTitle, saveConversations } = conversation.value;
    updateTitle(id, title);
    saveConversations();
  };


  const getMessageByCardId = (cardId: string) => {
    if (!conversation.value || !cardId) {
      return;
    }

    const messages = conversation.value.getCurrentConversation()?.messages;
    const aiCard = findSchemaCardByCardId(messages, cardId);
    if (aiCard) {
      return aiCard;
    }

    const manualCard = findManualCardInMessages(messages, cardId);
    if (!manualCard) {
      return;
    }

    const matchedEdit = getManualEdits(manualCard).find((edit) => edit.editId === cardId);
    return matchedEdit ? manualEditToCardSnapshot(manualCard, matchedEdit) : manualCard;
  };

  const setCurrentCardId = (cardId: string) => {
    currentCardId.value = cardId;
  };

  const getCurrentCardId = () => {
    return currentCardId.value;
  };

  const templateSchemaList = computed(() => {
    if (!conversation.value) {
      return [];
    }

    return conversation.value.state.conversations.map((item) => {
      const schemaInfo = findLatestSchemaInConversation(item.messages);
      return {
        id: item.id,
        name: item.title,
        schema: schemaInfo?.schema ?? '',
      };
    });
  });


  const getTemplateChatConfig = () => ({
    url: templateChatUrl,
    llmConfig: templateLlmConfig,
    templateSchema: currentSchema.value,
  });


  const saveConversations = () => {
    conversation.value?.saveConversations();
  };

  const MANUAL_SCHEMA_SAVE_INPUT = '手动编辑保存';


  const appendManualSchemaVersion = (
    schema: Record<string, unknown>,
    options: {
      prevSchema?: Record<string, unknown>;
      input?: string;
      sourceCardId?: string;
      sourceCardGeneratedTime?: string;
      sourceCardInput?: string;
    } = {},
  ) => {
    if (!conversation.value) {
      return null;
    }

    const prevSchema = options.prevSchema ?? currentSchema.value ?? {};
    const prevSchemaStr = JSON.stringify(prevSchema);
    const schemaStr = JSON.stringify(schema);
    const generatedTime = formatDate(new Date());
    const input = options.input ?? MANUAL_SCHEMA_SAVE_INPUT;
    const editRecord: ISchemaManualEditRecord = {
      editId: generateId(),
      schema: schemaStr,
      prevSchema: prevSchemaStr,
      generatedTime,
      input,
    };

    const attachSourceMetadata = (sourceCardId: string) => {
      editRecord.sourceCardId = sourceCardId;
      if (options.sourceCardInput?.trim()) {
        editRecord.sourceCardInput = options.sourceCardInput.trim();
      }
      if (options.sourceCardGeneratedTime?.trim()) {
        editRecord.sourceCardGeneratedTime = options.sourceCardGeneratedTime.trim();
      }
      const sourceCard = getMessageByCardId(sourceCardId);
      if (!editRecord.sourceCardInput?.trim() && sourceCard?.input?.trim()) {
        editRecord.sourceCardInput = sourceCard.input.trim();
      }
      if (!editRecord.sourceCardGeneratedTime?.trim() && sourceCard?.generatedTime?.trim()) {
        editRecord.sourceCardGeneratedTime = sourceCard.generatedTime;
      }
    };

    if (options.sourceCardId) {
      attachSourceMetadata(options.sourceCardId);
    }

    const messageMgr = conversation.value.messageManager.value;
    const currentConversation = conversation.value.getCurrentConversation();
    if (!messageMgr || !currentConversation) {
      return null;
    }

    const msgs = messageMgr.messages.value;
    const mergeTarget = getMergeableManualSaveMessage(msgs);

    let cardId: string;

    if (mergeTarget) {
      const { message: lastMessage, card } = mergeTarget;
      card.edits = [...getManualEdits(card), editRecord];
      syncManualCardLatestFields(card);
      cardId = card.cardId;
      lastMessage.messageId = cardId;
    } else {
      cardId = generateId();
      const cardMessage: ISchemaManualMessageItem = {
        type: 'schema-manual',
        content: schemaStr,
        input,
        cardId,
        generatedTime,
        schema: schemaStr,
        prevSchema: prevSchemaStr,
        edits: [editRecord],
      };

      const manualSaveMessage = {
        role: 'assistant',
        content: '',
        messageId: cardId,
        messages: [cardMessage],
      } as ChatMessage;

      msgs.push(manualSaveMessage);
    }

    messageMgr.messages.value = [...msgs];
    currentConversation.messages = [...msgs];
    currentConversation.updatedAt = Date.now();

    setCurrentSchema(schema);
    setCurrentPreviewSchema(schema);
    setCurrentCardId(cardId);
    conversation.value.saveConversations();

    return cardId;
  };

  return {
    isTemplateInit,
    templateConversationState,
    conversation: conversation.value,
    getTemplateChatConfig,
    saveConversations,
    appendManualSchemaVersion,
    applySchemaFromMessages,
    currentSchema,
    currentPreviewSchema,
    currentPreviewSchemaComplete,
    currentCardId,
    currentConversationId,
    templateProvider,
    messages,
    templateSchemaList,
    createTemplate,
    changeLlmConfig,
    setCurrentPreviewSchema,
    setCurrentSchema,
    setCurrentCardId,
    getCurrentCardId,
    switchTemplate,
    deleteTemplate,
    updateTemplateTitle,
    getMessageByCardId,
  };
}
