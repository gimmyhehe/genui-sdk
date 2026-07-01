import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaManualMessageItem, ISchemaManualEditRecord } from '../chat.types';
import { formatDate, generateId } from '../../../utils';
import {
  findSchemaCardByCardId,
  findManualCardInMessages,
  getMergeableManualSaveMessage,
  getManualEdits,
  syncManualCardLatestFields,
  manualEditToCardSnapshot,
} from '../template-chat-utils';
import { useTemplateConversation } from './use-template-conversation';
import { useTemplateSchema } from './use-template-schema';

export function useSchemaVersionWrite() {
  const {
    getMessageManager,
    getCurrentConversation,
    saveConversations,
  } = useTemplateConversation();
  const {
    currentSchema,
    setCurrentSchema,
    setCurrentPreviewSchema,
    adoptedCardId,
    setCurrentCardId,
  } = useTemplateSchema();

  const getMessageByCardId = (cardId: string) => {
    if (!cardId) {
      return;
    }

    const msgs = getCurrentConversation()?.messages;
    const aiCard = findSchemaCardByCardId(msgs, cardId);
    if (aiCard) {
      return aiCard;
    }

    const manualCard = findManualCardInMessages(msgs, cardId);
    if (!manualCard) {
      return;
    }

    const matchedEdit = getManualEdits(manualCard).find((edit) => edit.editId === cardId);
    return matchedEdit ? manualEditToCardSnapshot(manualCard, matchedEdit) : manualCard;
  };

  const writeNewVersion = (
    schemaPayload: Record<string, unknown>,
    options: {
      prevSchema?: Record<string, unknown>;
      input?: string;
      sourceCardId?: string;
      sourceCardGeneratedTime?: string;
      sourceCardInput?: string;
    } = {},
  ) => {
    const messageMgr = getMessageManager();
    const currentConversation = getCurrentConversation();
    if (!messageMgr || !currentConversation) {
      return null;
    }

    const prevSchema = options.prevSchema ?? currentSchema.value ?? {};
    const prevSchemaStr = JSON.stringify(prevSchema);
    const schemaStr = JSON.stringify(schemaPayload);
    const generatedTime = formatDate(new Date());
    const userInput = options.input?.trim();
    const editRecord: ISchemaManualEditRecord = {
      editId: generateId(),
      schema: schemaStr,
      prevSchema: prevSchemaStr,
      generatedTime,
      input: userInput ?? '',
      inputType: userInput ? 'user' : 'manual_edit_save',
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
        input: editRecord.input,
        inputType: editRecord.inputType,
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

    setCurrentSchema(schemaPayload);
    setCurrentPreviewSchema(schemaPayload);
    setCurrentCardId(cardId);
    adoptedCardId.value = cardId;
    saveConversations();

    return cardId;
  };

  return {
    getMessageByCardId,
    writeNewVersion,
  };
}
