import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IJsonPatchMessageItem, ISchemaCardMessageItem, ISchemaManualMessageItem } from '../chat.types';
import { formatDate } from '../../../utils';
import { applyJsonPatchOperations } from './json-patch-format';

export type ISchemaCardLikeMessage =
  | ISchemaCardMessageItem
  | IJsonPatchMessageItem
  | ISchemaManualMessageItem;

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
  if ((card.type === 'schema-card' || card.type === 'schema-manual') && card.content?.trim()) {
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
  // json-patch 以 prevSchema + patch 为准，避免 card.schema 缓存滞后
  if (card.type === 'json-patch' && card.prevSchema?.trim() && card.content?.trim()) {
    try {
      const baseline = JSON.parse(card.prevSchema);
      const operations = JSON.parse(card.content);
      if (Array.isArray(operations) && operations.length > 0) {
        const fromPatch = applyJsonPatchOperations(baseline, operations);
        if (fromPatch && isRenderableSchema(fromPatch)) {
          return fromPatch;
        }
      }
    } catch {
      // 解析失败时回退到 schema 字段
    }
  }

  const schemaString = resolveSchemaStringFromCard(card);
  if (schemaString) {
    const parsed = parseSchemaJson(schemaString);
    if (parsed && isRenderableSchema(parsed)) {
      return parsed;
    }
  }

  return null;
}

function canResolveSchemaFromCard(card: ISchemaCardLikeMessage): boolean {
  if (resolveSchemaStringFromCard(card)) {
    return true;
  }
  return card.type === 'json-patch' && Boolean(card.prevSchema?.trim() && card.content?.trim());
}

export type IStreamingSchemaCardMessage = ISchemaCardMessageItem | IJsonPatchMessageItem;

/**
 * 是否为 AI 流式生成中的 schema 卡片（schema-card / json-patch）
 * @param item 版本卡片消息
 * @returns 是否为 AI 流式 schema 卡片
 */
export function isStreamingSchemaCardItem(
  item: ISchemaCardLikeMessage,
): item is IStreamingSchemaCardMessage {
  return item.type === 'schema-card' || item.type === 'json-patch';
}

/**
 * 按 cardId 查找 AI 生成的 schema 版本卡片（不要求已可解析）
 * @param messages 当前会话消息列表
 * @param cardId 目标卡片 id
 * @returns 匹配的 AI schema 卡片，未找到时返回 null
 */
export function findSchemaCardByCardId(
  messages: ChatMessage[] | undefined,
  cardId: string,
): IStreamingSchemaCardMessage | null {
  if (!messages?.length || !cardId) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const card = items.find(
      (item): item is IStreamingSchemaCardMessage =>
        isStreamingSchemaCardItem(item) && item.cardId === cardId,
    );

    if (card) {
      return card;
    }
  }

  return null;
}

/**
 * 查找最近一条尚未写入 generatedTime 的 AI schema 卡片
 * @param messages 当前会话消息列表
 * @returns 流式生成中的 pending 卡片，未找到时返回 null
 */
export function findLatestPendingSchemaCard(
  messages: ChatMessage[] | undefined,
): IStreamingSchemaCardMessage | null {
  if (!messages?.length) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const card = [...items]
      .reverse()
      .find(
        (item): item is IStreamingSchemaCardMessage =>
          isStreamingSchemaCardItem(item) && !item.generatedTime?.trim(),
      );

    if (card) {
      return card;
    }
  }

  return null;
}

/**
 * 按会话顺序查找最近一条 schema 版本卡片（含未完成 pending，不要求可解析）
 * @param messages 当前会话消息列表
 * @returns 最近一条 schema 卡片，未找到时返回 null
 */
export function findLatestSchemaCardInConversation(
  messages: ChatMessage[] | undefined,
): ISchemaCardLikeMessage | null {
  if (!messages?.length) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const cardMessage = [...items]
      .reverse()
      .find(
        (item): item is ISchemaCardLikeMessage =>
          item.type === 'schema-card' || item.type === 'json-patch' || item.type === 'schema-manual',
      );

    if (cardMessage) {
      return cardMessage;
    }
  }

  return null;
}

function applyPendingCardFinalization(
  card: IStreamingSchemaCardMessage,
  options: { schema?: unknown; prevSchema?: string },
): void {
  const schemaPayload = options.schema ?? rebuildSchemaFromCard(card);
  if (schemaPayload && !card.schema?.trim()) {
    card.schema = JSON.stringify(schemaPayload);
  }
  if (options.prevSchema !== undefined) {
    card.prevSchema = options.prevSchema;
  }
  card.generatedTime = formatDate(new Date());
}

/**
 * 流式结束后补全 pending AI 卡片的 generatedTime 与 schema 快照
 * @param messages 当前会话消息列表
 * @param options.cardId 优先匹配的卡片 id
 * @param options.schema 最终 schema，缺省时从卡片内容还原
 * @param options.prevSchema 变更前 schema
 * @returns 是否成功补全
 */
export function finalizePendingSchemaCard(
  messages: ChatMessage[] | undefined,
  options: {
    cardId?: string;
    schema?: unknown;
    prevSchema?: string;
  } = {},
): boolean {
  const pendingCard =
    (options.cardId ? findSchemaCardByCardId(messages, options.cardId) : null)
    ?? findLatestPendingSchemaCard(messages);

  if (!pendingCard || pendingCard.generatedTime?.trim()) {
    return false;
  }

  applyPendingCardFinalization(pendingCard, options);
  return true;
}

/**
 * 修复会话中所有遗留的 pending AI 卡片（如流异常中断或持久化时未写入 generatedTime）
 * @param messages 当前会话消息列表
 * @returns 是否修复了至少一条卡片
 */
export function repairAllStalePendingSchemaCards(messages: ChatMessage[] | undefined): boolean {
  let updated = false;

  while (true) {
    const pending = findLatestPendingSchemaCard(messages);
    if (!pending) {
      break;
    }
    applyPendingCardFinalization(pending, {});
    updated = true;
  }

  return updated;
}

/** 从会话消息中反向查找最近一条含 schema 的卡片 */
export function findLatestSchemaInConversation(
  messages: ChatMessage[] | undefined,
): ILatestSchemaInConversation | null {
  if (!messages?.length) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const chatMessage = messages[i];

    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    const cardMessage = [...items]
      .reverse()
      .find(
        (item): item is ISchemaCardLikeMessage =>
          item.type === 'schema-card' || item.type === 'json-patch' || item.type === 'schema-manual',
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
