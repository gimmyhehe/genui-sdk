import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IJsonPatchMessageItem, ISchemaCardMessageItem, ISchemaManualMessageItem } from '../chat.types';
import { formatDate } from '../../../utils';
import { applyJsonPatchOperations } from './json-patch-format';
import { getManualEdits, manualEditToCardSnapshot } from './manual-schema';

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

/**
 * 是否为 tiny-schema-renderer 可渲染的 schema 结构
 * @param schema 待校验的 schema 对象
 * @returns 是否包含 componentName 或非空 children
 */
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

/**
 * 从卡片消息解析可渲染的 schema JSON 字符串
 * @param card schema-card / json-patch / schema-manual 卡片
 * @returns schema JSON 文本，无法解析时返回 null
 */
export function resolveSchemaStringFromCard(card: ISchemaCardLikeMessage): string | null {
  if (card.schema?.trim()) {
    return card.schema;
  }
  if ((card.type === 'schema-card' || card.type === 'schema-manual') && card.content?.trim()) {
    return card.content;
  }
  if (card.type === 'schema-manual') {
    const edits = getManualEdits(card);
    const latestEditSchema = edits[edits.length - 1]?.schema;
    if (latestEditSchema?.trim()) {
      return latestEditSchema;
    }
  }
  return null;
}

/**
 * 将 schema JSON 字符串解析为对象
 * @param schemaString JSON 文本
 * @returns 解析后的对象，失败或非对象时返回 null
 */
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

/**
 * 解析 json-patch 卡片的 prevSchema，缺省时从会话推断
 * @param card json-patch 卡片
 * @param messages 当前会话消息
 * @returns prevSchema JSON 文本
 */
export function resolveJsonPatchPrevSchemaString(
  card: IJsonPatchMessageItem,
  messages?: ChatMessage[],
): string {
  return card.prevSchema?.trim()
    || findPreviousSchemaStringBeforeCard(messages, card.cardId)
    || '';
}

/**
 * 解析 json-patch content 为操作数组
 * @param content patch JSON 文本
 * @returns 非空操作数组，失败时返回 null
 */
export function parseJsonPatchOperations(content: string): unknown[] | null {
  if (!content?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 从 schema-card / json-patch / schema-manual 卡片还原可渲染 schema 对象
 * @param card 版本卡片消息
 * @param options.messages 会话消息，json-patch 缺 prevSchema 时用于推断基准 schema
 * @returns 可渲染 schema，无法还原时返回 null
 */
export function rebuildSchemaFromCard(
  card: ISchemaCardLikeMessage,
  options: { messages?: ChatMessage[] } = {},
): Record<string, unknown> | null {
  // json-patch 以 prevSchema + patch 为准，避免 card.schema 缓存滞后
  if (card.type === 'json-patch' && card.content?.trim()) {
    const prevSchemaStr = resolveJsonPatchPrevSchemaString(card, options.messages);
    const baseline = parseSchemaJson(prevSchemaStr);
    const operations = parseJsonPatchOperations(card.content);
    if (baseline && operations) {
      const fromPatch = applyJsonPatchOperations(baseline, operations);
      if (fromPatch && isRenderableSchema(fromPatch)) {
        return fromPatch;
      }
      if (fromPatch && typeof fromPatch === 'object') {
        return fromPatch as Record<string, unknown>;
      }
    }
  }

  const schemaString = resolveSchemaStringFromCard(card);
  if (schemaString) {
    const parsed = parseSchemaJson(schemaString);
    if (parsed && isRenderableSchema(parsed)) {
      return parsed;
    }
    if (parsed && (card.type === 'schema-manual' || card.type === 'schema-card' || card.type === 'json-patch')) {
      return parsed;
    }
  }

  return null;
}

/**
 * 查找目标卡片之前最近一条可还原的 schema JSON 文本（供 json-patch 补 prevSchema）
 * @param messages 当前会话消息列表
 * @param targetCardId 目标 AI 卡片 cardId
 * @returns 上一版 schema JSON 文本，未找到时返回 null
 */
export function findPreviousSchemaStringBeforeCard(
  messages: ChatMessage[] | undefined,
  targetCardId: string,
): string | null {
  if (!messages?.length || !targetCardId) {
    return null;
  }

  let previousSchema: string | null = null;

  for (const chatMessage of messages) {
    const items = (chatMessage as { messages?: ISchemaCardLikeMessage[] }).messages;
    if (!Array.isArray(items)) {
      continue;
    }

    for (const item of items) {
      const isAiCard = item.type === 'schema-card' || item.type === 'json-patch';
      const isManualCard = item.type === 'schema-manual';
      if (!isAiCard && !isManualCard) {
        continue;
      }

      if (isManualCard) {
        const manualCard = item as ISchemaManualMessageItem;
        if (manualCard.cardId === targetCardId) {
          return previousSchema;
        }
        for (const edit of getManualEdits(manualCard)) {
          if (edit.editId === targetCardId) {
            return previousSchema;
          }
          const snapshot = manualEditToCardSnapshot(manualCard, edit);
          const rebuilt = rebuildSchemaFromCard(snapshot, { messages });
          if (rebuilt) {
            previousSchema = JSON.stringify(rebuilt);
          } else if (edit.schema?.trim()) {
            previousSchema = edit.schema;
          }
        }
        continue;
      }

      if (item.cardId === targetCardId) {
        return previousSchema;
      }

      const rebuilt = rebuildSchemaFromCard(item, { messages });
      if (rebuilt) {
        previousSchema = JSON.stringify(rebuilt);
      } else if (item.schema?.trim()) {
        previousSchema = item.schema;
      }
    }
  }

  return null;
}

/**
 * 版本卡片是否可纳入历史记录（已完成且无法还原 schema 的卡片不展示）
 * @param card 版本卡片消息
 * @param messages 当前会话消息列表
 * @returns 是否可收集/展示
 */
export function isSchemaVersionHistoryCollectible(
  card: ISchemaCardLikeMessage,
  messages?: ChatMessage[],
): boolean {
  if (!card.cardId?.trim()) {
    return false;
  }
  if (!card.generatedTime?.trim()) {
    return true;
  }
  return rebuildSchemaFromCard(card, { messages }) !== null;
}

/**
 * 判断卡片是否具备可还原 schema 的最低信息（含 json-patch 的 prevSchema + content）
 * @param card 版本卡片消息
 * @returns 是否可尝试还原 schema
 */
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

/**
 * 补全 pending AI 卡片的 schema 快照、prevSchema 与 generatedTime
 * @param card 流式生成中的 AI schema 卡片
 * @param options.schema 最终 schema，缺省时从卡片内容还原
 * @param options.prevSchema 变更前 schema 文本
 */
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

/**
 * 从会话消息中反向查找最近一条可解析的 schema 版本
 * @param messages 当前会话消息列表
 * @returns 最近 schema 信息（含 cardMessage），未找到时返回 null
 */
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

/**
 * 从会话消息还原右侧预览所需的 schema 对象与 cardId
 * @param messages 当前会话消息列表
 * @returns 可渲染 schema 与 cardId，无法还原时返回 null
 */
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
