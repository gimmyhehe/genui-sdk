import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaManualEditRecord, ISchemaManualMessageItem } from '../chat.types';
import { isManualSchemaSaveMessage } from './context-message';

/**
 * 获取手动保存卡片内的全部编辑记录（兼容无 edits 字段的旧数据）
 * @param card schema-manual 类型卡片
 * @returns 编辑记录列表
 */
export function getManualEdits(card: ISchemaManualMessageItem): ISchemaManualEditRecord[] {
  if (card.edits?.length) {
    return card.edits;
  }
  return [
    {
      editId: card.cardId,
      schema: card.schema,
      prevSchema: card.prevSchema,
      generatedTime: card.generatedTime,
      input: card.input,
    },
  ];
}

/**
 * 将某次编辑还原为可查找的卡片快照（供历史面板 / rebuild 使用）
 * @param card 手动保存卡片
 * @param edit 卡片内某次编辑记录
 * @returns 可用于 rebuild 的卡片快照
 */
export function manualEditToCardSnapshot(
  card: ISchemaManualMessageItem,
  edit: ISchemaManualEditRecord,
): ISchemaManualMessageItem {
  return {
    ...card,
    content: edit.schema,
    schema: edit.schema,
    prevSchema: edit.prevSchema,
    generatedTime: edit.generatedTime,
    input: edit.input,
  };
}

/**
 * 按 cardId 或 editId 查找手动保存卡片
 * @param messages 当前会话消息列表
 * @param cardOrEditId 卡片 cardId 或某次编辑的 editId
 * @returns 匹配的手动保存卡片，未找到时返回 null
 */
export function findManualCardInMessages(
  messages: ChatMessage[] | undefined,
  cardOrEditId: string,
): ISchemaManualMessageItem | null {
  if (!messages?.length || !cardOrEditId) {
    return null;
  }

  for (const chatMessage of messages) {
    const items = (chatMessage as { messages?: ISchemaManualMessageItem[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    for (const item of items) {
      if (item.type !== 'schema-manual') {
        continue;
      }
      if (item.cardId === cardOrEditId) {
        return item;
      }
      if (item.edits?.some((edit) => edit.editId === cardOrEditId)) {
        return item;
      }
    }
  }

  return null;
}

/**
 * 获取可合并手动保存的目标消息（仅当上一条会话消息为手动保存时）
 * @param messages 当前会话消息列表
 * @returns 可追加 edit 的消息与卡片，否则 null
 */
export function getMergeableManualSaveMessage(
  messages: ChatMessage[] | undefined,
): { message: ChatMessage; card: ISchemaManualMessageItem } | null {
  if (!messages?.length) {
    return null;
  }

  const lastMessage = messages[messages.length - 1];
  if (!isManualSchemaSaveMessage(lastMessage)) {
    return null;
  }

  const card = (lastMessage as { messages?: ISchemaManualMessageItem[] }).messages?.[0];
  if (card?.type === 'schema-manual') {
    return { message: lastMessage, card };
  }

  return null;
}

/**
 * 将手动保存卡片的顶层字段同步为 edits 中最新一次编辑
 * @param card schema-manual 类型卡片（原地修改）
 */
export function syncManualCardLatestFields(card: ISchemaManualMessageItem): void {
  const edits = getManualEdits(card);
  const latest = edits[edits.length - 1];
  card.content = latest.schema;
  card.schema = latest.schema;
  card.generatedTime = latest.generatedTime;
  card.input = latest.input;
  card.prevSchema = edits[0].prevSchema;
  card.edits = edits;
}
