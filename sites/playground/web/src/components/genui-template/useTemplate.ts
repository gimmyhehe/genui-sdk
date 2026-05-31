import { ref, shallowRef, computed } from 'vue';
import { useConversation, IndexedDBStrategy } from '@opentiny/genui-sdk-vue';
import { AIClient, type ChatMessage } from '@opentiny/tiny-robot-kit';
import { CustomModelProvider } from './template-provider';
import type { LLMConfig, ISchemaManualMessageItem } from './chat.types';
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
} from './template-chat-utils';

const conversation = shallowRef<ReturnType<typeof useConversation> | null>(null);
let templateProvider: CustomModelProvider | null = null;
let templateChatUrl = '';
let templateLlmConfig: LLMConfig = { model: '', temperature: 0.3 };
// 判断模板会话是否初始化完成。
const isTemplateInit = ref(false);
// 当前 schema。 可能是：AI 生成的 schemaJson、AI 生成的 jsonPatch 更新后的 schema、切换到历史版本的 schema、编辑器中手动修改的 schema。
const currentSchema = shallowRef<any>(null);
// 当前预览 schema。用于编辑器显示。
const currentPreviewSchema = shallowRef<any>(null);
const currentPreviewSchemaComplete = ref(true);
// 当前卡片 id，用于记录卡片 id，避免重复执行 patch 操作
const currentCardId = ref<string>('');
const DEFAULT_TEMPLATE_TITLE = '新模板';

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

    // 创建 provider 实例
    templateProvider = new CustomModelProvider({
      url,
      llmConfig: llmConfig || { model: '', temperature: 0.3 },
    });

    // 创建 client 实例
    const clientInstance = new AIClient({
      provider: 'custom',
      providerImplementation: templateProvider,
    });

    // 创建 conversation 实例
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
          // 如果历史会话为空，则创建一个默认会话
          if (!conversations.length) {
            conversation.value!.createConversation(DEFAULT_TEMPLATE_TITLE);
            conversation.value!.saveConversations();
          }
          // IndexedDB 加载完成后再恢复 schema，避免早于 GenuiTemplate onMounted 的空窗期
          applySchemaFromMessages(conversation.value!.getCurrentConversation()?.messages);
        },
        onFinish(data: any, context) {
          if (data?.type === 'error') {
            context.messages.value.push({
              role: 'assistant',
              content: '',
              messages: [{ type: 'error-text', content: data.error.message }],
            });
          }
          conversation.value!.saveConversations();
        },
      },
    });

    isTemplateInit.value = true;
  }

  const messages = computed(() => conversation.value?.getCurrentConversation()?.messages ?? []);
  const templateConversationState = computed(() => conversation.value?.state);
  const currentConversationId = computed(() => conversation.value?.state.currentId);

  /**
   * 修改 LLM 配置
   * @param llmConfig LLM 配置
   */
  const changeLlmConfig = (llmConfig: LLMConfig) => {
    templateProvider.changeLlmConfig(llmConfig);
  };

  /**
   * 设置当前预览 schema，编辑器使用。
   * @param schema 模板 schema
   */
  const setCurrentPreviewSchema = (schema: any, isComplete: boolean = true) => {
    currentPreviewSchema.value = schema;
    if (isComplete !== currentPreviewSchemaComplete.value) {
      currentPreviewSchemaComplete.value = isComplete;
    }
  };

  /**
   * 设置当前 schema，供服务端组装 prompt 时使用。
   * @param schema 模板 schema
   */
  const setCurrentSchema = (schema: any) => {
    currentSchema.value = schema;
    templateProvider.setTemplateSchema(schema);
  };

  /**
   * 创建模板
   */
  const createTemplate = () => {
    if (!conversation.value) {
      return;
    }

    const { createConversation, saveConversations } = conversation.value;
    createConversation(DEFAULT_TEMPLATE_TITLE);
    saveConversations();
    setCurrentSchema(null);
    setCurrentPreviewSchema(null);
  };

  /**
   * 切换模板
   * @param id 模板 id
   */
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

  /**
   * 删除模板
   * @param id 模板 id
   */
  const deleteTemplate = (id: string) => {
    if (!conversation.value) {
      return;
    }

    const { state, deleteConversation, saveConversations } = conversation.value;

    deleteConversation(id);
    saveConversations();

    // 保证至少有一个会话
    if (state.conversations.length === 0) {
      createTemplate();
    }
  };

  /**
   * 更新模板标题
   * @param id 模板 id
   * @param title 模板标题
   */
  const updateTemplateTitle = (id: string, title: string) => {
    if (!conversation.value) {
      return;
    }

    const { updateTitle, saveConversations } = conversation.value;
    updateTitle(id, title);
    saveConversations();
  };

  /**
   * 根据卡片 id 获取对应的卡片消息
   * @param cardId 卡片 id
   * @returns 卡片消息
   */
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

  // 从对话中提取示例 schema 列表
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

  /**
   * 将编辑器中的 schema 保存为版本卡片（schema-manual 类型消息）
   * @param schema 保存后的 schema 对象
   * @param options.prevSchema 保存前的基准 schema，缺省时取 currentSchema
   * @returns 新建或合并后的卡片 cardId，失败时返回 null
   */
  const appendManualSchemaVersion = (
    schema: Record<string, unknown>,
    options: { prevSchema?: Record<string, unknown> } = {},
  ) => {
    if (!conversation.value) {
      return null;
    }

    const prevSchema = options.prevSchema ?? currentSchema.value ?? {};
    const prevSchemaStr = JSON.stringify(prevSchema);
    const schemaStr = JSON.stringify(schema);
    const generatedTime = formatDate(new Date());
    const editRecord = {
      editId: generateId(),
      schema: schemaStr,
      prevSchema: prevSchemaStr,
      generatedTime,
      input: MANUAL_SCHEMA_SAVE_INPUT,
    };

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
        input: MANUAL_SCHEMA_SAVE_INPUT,
        cardId,
        generatedTime,
        schema: schemaStr,
        prevSchema: prevSchemaStr,
        edits: [editRecord],
      };

      const manualSaveMessage = {
        role: 'user',
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
