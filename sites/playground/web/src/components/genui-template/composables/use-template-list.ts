import { useTemplateConversation } from './use-template-conversation';
import { useTemplateSchema } from './use-template-schema';

export function useTemplateList() {
  const {
    createConversation,
    switchConversation,
    deleteConversation,
    getCurrentConversation,
  } = useTemplateConversation();
  const {
    setCurrentSchema,
    setCurrentPreviewSchema,
    adoptedCardId,
    setCurrentCardId,
    applySchemaFromMessages,
  } = useTemplateSchema();

  const resetEmptyTemplateSchema = () => {
    setCurrentSchema(null);
    setCurrentPreviewSchema(null);
    setCurrentCardId('');
    adoptedCardId.value = '';
  };

  const createTemplate = () => {
    createConversation();
    resetEmptyTemplateSchema();
  };

  const switchTemplate = (id: string) => {
    switchConversation(id);
    const currentMessages = getCurrentConversation()?.messages;

    if (!currentMessages?.length) {
      resetEmptyTemplateSchema();
      return;
    }

    applySchemaFromMessages(currentMessages);
  };

  const deleteTemplate = (id: string) => {
    const isEmpty = deleteConversation(id);
    if (isEmpty) {
      createTemplate();
    }
  };

  return {
    createTemplate,
    switchTemplate,
    deleteTemplate,
  };
}
