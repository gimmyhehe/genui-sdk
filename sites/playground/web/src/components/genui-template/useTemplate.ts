import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig } from './chat.types';
import { useTemplateConversation } from './composables/use-template-conversation';
import { useTemplateSchema } from './composables/use-template-schema';
import { useTemplateList } from './composables/use-template-list';
import { useSchemaVersionWrite } from './composables/use-schema-version-write';

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
  const list = useTemplateList();
  const { getMessageByCardId } = useSchemaVersionWrite();

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
    adoptedCardId: schema.adoptedCardId,
    setCurrentPreviewSchema: schema.setCurrentPreviewSchema,
    setCurrentSchema: schema.setCurrentSchema,
    setCurrentCardId: schema.setCurrentCardId,
    setAdoptedCardId: schema.setAdoptedCardId,
    getCurrentCardId: schema.getCurrentCardId,
    applySchemaFromMessages: schema.applySchemaFromMessages,
    createTemplate: list.createTemplate,
    switchTemplate: list.switchTemplate,
    deleteTemplate: list.deleteTemplate,
    changeLlmConfig: conversation.changeLlmConfig,
    updateTemplateTitle: conversation.updateConversationTitle,
    getMessageByCardId,
  };
}
