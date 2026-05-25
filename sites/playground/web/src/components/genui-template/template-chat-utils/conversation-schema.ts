import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IJsonPatchMessageItem, ISchemaCardMessageItem } from '../chat.types';
import { isContextCompressMessage } from './context-message';
import { applyJsonPatchOperations } from './json-patch-format';

export type ISchemaCardLikeMessage = ISchemaCardMessageItem | IJsonPatchMessageItem;

export interface ILatestSchemaInConversation {
  schema: string;
  cardId: string;
  prevSchema: string;
  cardMessage: ISchemaCardLikeMessage;
}

/** 是否为 tiny-schema-renderer 可渲染的 schema 结构 */
export function isRenderableSchema(schema: unknown): schema is Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  const node = schema as Record<string, unknown>;
  if (typeof node.componentName === 'string' && node.componentName.length > 0) {
    return true;
  }
  return Array.isArray(node.children) && node.children.length > 0;
}

/** 从卡片消息解析可渲染的 schema JSON 字符串 */
export function resolveSchemaStringFromCard(card: ISchemaCardLikeMessage): string | null {
  if (card.schema?.trim()) {
    return card.schema;
  }
  if (card.type === 'schema-card' && card.content?.trim()) {
    return card.content;
  }
  return null;
}

export function parseSchemaJson(schemaString: string): Record<string, unknown> | null {
  if (!schemaString?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(schemaString);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** 从 schema-card / json-patch 卡片还原可渲染 schema 对象 */
export function rebuildSchemaFromCard(card: ISchemaCardLikeMessage): Record<string, unknown> | null {
  const schemaString = resolveSchemaStringFromCard(card);
  if (schemaString) {
    const parsed = parseSchemaJson(schemaString);
    if (parsed && isRenderableSchema(parsed)) {
      return parsed;
    }
  }

  if (card.type !== 'json-patch' || !card.prevSchema?.trim() || !card.content?.trim()) {
    return null;
  }

  try {
    const baseline = JSON.parse(card.prevSchema);
    const operations = JSON.parse(card.content);
    if (!Array.isArray(operations) || operations.length === 0) {
      return null;
    }

    const target = applyJsonPatchOperations(baseline, operations);
    return target && isRenderableSchema(target) ? target : null;
  } catch {
    return null;
  }
}

function canResolveSchemaFromCard(card: ISchemaCardLikeMessage): boolean {
  if (resolveSchemaStringFromCard(card)) {
    return true;
  }
  return card.type === 'json-patch' && Boolean(card.prevSchema?.trim() && card.content?.trim());
}

/** 从会话消息中反向查找最近一条含 schema 的卡片（跳过 context-compress 等无卡片消息） */
export function findLatestSchemaInConversation(
  messages: ChatMessage[] | undefined,
): ILatestSchemaInConversation | null {
  if (!messages?.length) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];
    if (isContextCompressMessage(chatMessage)) {
      continue;
    }

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const cardMessage = [...items]
      .reverse()
      .find(
        (item): item is ISchemaCardLikeMessage =>
          item.type === 'schema-card' || item.type === 'json-patch',
      );

    if (cardMessage && canResolveSchemaFromCard(cardMessage)) {
      return {
        schema: resolveSchemaStringFromCard(cardMessage) ?? '',
        cardId: cardMessage.cardId,
        prevSchema: cardMessage.prevSchema ?? '',
        cardMessage,
      };
    }
  }

  return null;
}

/** 从会话消息还原右侧预览所需的 schema 对象 */
export function resolveRenderableSchemaFromMessages(
  messages: ChatMessage[] | undefined,
): { schema: Record<string, unknown>; cardId: string } | null {
  const latest = findLatestSchemaInConversation(messages);
  if (!latest) {
    return null;
  }

  const schema = rebuildSchemaFromCard(latest.cardMessage);
  if (!schema) {
    return null;
  }

  return { schema, cardId: latest.cardId };
}
