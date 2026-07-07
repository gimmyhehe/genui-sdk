import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig } from './chat.types';
import { useTemplateConversation } from './composables/use-template-conversation';
import { useTemplateSchema } from './composables/use-template-schema';
import { useTemplateVersionControl } from './composables/use-template-version-control';

export interface UseTemplateOptions {
  url: string;
  llmConfig?: LLMConfig;
  onLoaded?: (messages: ChatMessage[] | undefined) => void;
}

export default function useTemplate(options?: UseTemplateOptions) {
  if (options?.url) {
    const { url, llmConfig, onLoaded } = options;
    useTemplateConversation({
      url,
      llmConfig,
      onLoaded: (loadedMessages) => {
        if (onLoaded) {
          onLoaded(loadedMessages);
        } else {
          useTemplateSchema().applySchemaFromMessages(loadedMessages);
        }
      },
    });
  }

  const conversation = useTemplateConversation();
  const schema = useTemplateSchema();
  const { getMessageByCardId } = useTemplateVersionControl();

  const resetEmptyTemplateSchema = () => {
    schema.setCurrentSchema(null);
    schema.setCurrentPreviewSchema(null);
    schema.setCurrentCardId('');
  };

  const createTemplate = () => {
    conversation.createConversation();
    resetEmptyTemplateSchema();
  };

  const switchTemplate = (id: string) => {
    conversation.switchConversation(id);
    const currentMessages = conversation.getCurrentConversation()?.messages;

    if (!currentMessages?.length) {
      resetEmptyTemplateSchema();
      return;
    }

    schema.applySchemaFromMessages(currentMessages);
  };

  const deleteTemplate = (id: string) => {
    const isEmpty = conversation.deleteConversation(id);
    if (isEmpty) {
      createTemplate();
    }
  };

  return {
    isTemplateInit: conversation.isTemplateInit,
    conversationKit: conversation.conversationKit,
    conversation: conversation.conversationKit.value,
    templateConversationState: conversation.templateConversationState,
    currentConversationId: conversation.currentConversationId,
    templateProvider: conversation.templateProvider,
    messages: conversation.messages,
    templateSchemaList: conversation.templateSchemaList,
    currentSchema: schema.currentSchema,
    currentPreviewSchema: schema.currentPreviewSchema,
    currentPreviewSchemaComplete: schema.currentPreviewSchemaComplete,
    currentCardId: schema.currentCardId,
    setCurrentPreviewSchema: schema.setCurrentPreviewSchema,
    setCurrentSchema: schema.setCurrentSchema,
    setCurrentCardId: schema.setCurrentCardId,
    getCurrentCardId: schema.getCurrentCardId,
    applySchemaFromMessages: schema.applySchemaFromMessages,
    createTemplate,
    switchTemplate,
    deleteTemplate,
    changeLlmConfig: conversation.changeLlmConfig,
    updateTemplateTitle: conversation.updateConversationTitle,
    getMessageByCardId,
  };
}
