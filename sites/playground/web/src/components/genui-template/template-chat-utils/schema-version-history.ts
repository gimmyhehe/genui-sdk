import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaCardLikeMessage } from './conversation-schema';
import { findSchemaCardByCardId, rebuildSchemaFromCard, isSchemaVersionHistoryCollectible } from './conversation-schema';
import { findManualCardInMessages, getManualEdits, manualEditToCardSnapshot } from './manual-schema';
import type { ISchemaManualEditRecord, ISchemaManualMessageItem } from '../chat.types';

export interface ISchemaVersionHistoryEntry {
  cardId: string;
  type: ISchemaCardLikeMessage['type'];
  input: string;
  generatedTime: string;
  createdAtMs: number;
  /** 会话中的出现顺序，越大越新 */
  sequenceIndex: number;
  timeLabel: string;
  description: string;
  authorLabel: string;
  authorType: 'user' | 'ai';
  isLatest: boolean;
  isCurrent: boolean;
  isPending: boolean;
  cardMessage: ISchemaCardLikeMessage;
}

const MS_PER_DAY = 86400000;

/**
 * 取本地时区某时刻所在日的 0 点毫秒时间戳
 * @param timeMs 毫秒时间戳
 * @returns 当日 0 点的毫秒时间戳
 */
const startOfLocalDay = (timeMs: number) => {
  const d = new Date(timeMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/**
 * 取本地时区某时刻所在自然周（周一为起点）的 0 点毫秒时间戳
 * @param timeMs 毫秒时间戳
 * @returns 当周周一 0 点的毫秒时间戳
 */
const startOfLocalWeek = (timeMs: number) => {
  const dayStart = startOfLocalDay(timeMs);
  const day = new Date(dayStart).getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  return dayStart - daysFromMonday * MS_PER_DAY;
};

/**
 * 数字补零为两位字符串
 * @param n 待格式化的数字
 * @returns 两位字符串
 */
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * 将 generatedTime 字符串解析为毫秒时间戳
 * @param generatedTime 卡片上的创建时间字符串
 * @returns 毫秒时间戳
 */
export function parseGeneratedTimeMs(generatedTime: string): number {
  const text = generatedTime?.trim();
  if (!text) {
    return 0;
  }
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? text.replace(' ', 'T')
    : text;
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/**
 * 历史面板时间点格式（如「6月8日 19:32」；跨年显示年份）
 * @param createdAtMs 创建时间毫秒戳
 * @param nowMs 当前时间毫秒戳，默认 Date.now()
 * @returns 展示用时间文本
 */
export function formatHistoryPointTimeLabel(createdAtMs: number, nowMs: number = Date.now()): string {
  const d = new Date(createdAtMs);
  const now = new Date(nowMs);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const timePart = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (d.getFullYear() === now.getFullYear()) {
    return `${month}月${day}日 ${timePart}`;
  }

  return `${d.getFullYear()}年${month}月${day}日 ${timePart}`;
}

/**
 * 格式化历史条目主时间
 * @param createdAtMs 创建时间毫秒戳
 * @returns 展示用时间标签
 */
export function formatHistoryTimeLabel(createdAtMs: number): string {
  return formatHistoryPointTimeLabel(createdAtMs);
}

/**
 * 根据创建时间返回历史面板分组标签（今天 / 昨天 / 本周星期 / 上周 / 月份）
 * @param createdAtMs 创建时间毫秒戳
 * @param nowMs 当前时间毫秒戳，默认 Date.now()
 * @returns 分组标签
 */
export function getHistoryTimeGroupLabel(createdAtMs: number, nowMs: number = Date.now()): string {
  const todayStart = startOfLocalDay(nowMs);
  const dayStart = startOfLocalDay(createdAtMs);
  const dayDiff = Math.round((todayStart - dayStart) / MS_PER_DAY);

  if (dayDiff <= 0) {
    return '今天';
  }
  if (dayDiff === 1) {
    return '昨天';
  }

  const currentWeekStart = startOfLocalWeek(nowMs);
  const createdWeekStart = startOfLocalWeek(createdAtMs);

  if (createdWeekStart === currentWeekStart) {
    return WEEKDAY_LABELS[new Date(createdAtMs).getDay()];
  }

  if (createdWeekStart === currentWeekStart - 7 * MS_PER_DAY) {
    return '上周';
  }

  const created = new Date(createdAtMs);
  const now = new Date(nowMs);
  if (created.getFullYear() === now.getFullYear()) {
    return `${created.getMonth() + 1}月`;
  }

  return `${created.getFullYear()}年${created.getMonth() + 1}月`;
}

/**
 * 生成历史条目副标题描述
 * @param card 版本卡片消息
 * @param options.isLatest 是否为会话最新版本
 * @param options.isPending 是否仍在流式生成中
 * @returns 展示用描述文本
 */
function buildDescription(
  card: ISchemaCardLikeMessage,
  options: { isLatest: boolean; isPending: boolean },
): string {
  if (options.isPending) {
    return '生成中...';
  }
  if (options.isLatest) {
    return '最近更新';
  }
  if (card.type === 'schema-manual') {
    return card.input?.trim() || '手动编辑保存';
  }
  if (card.type === 'json-patch') {
    return card.input?.trim() || '增量更新';
  }
  return card.input?.trim() || 'AI 生成版本';
}

/**
 * 解析来源版本的时间标签
 * @param entries 全量历史条目
 * @param messages 当前会话消息列表
 * @param cardOrEditId 来源版本 id
 * @returns 来源版本时间文本，无法解析时返回 null
 */
function resolveCardVersionTimeLabel(
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
  cardOrEditId: string,
): string | null {
  const historyEntry = entries.find((entry) => entry.cardId === cardOrEditId);
  if (historyEntry && !historyEntry.isPending) {
    return formatHistoryPointTimeLabel(historyEntry.createdAtMs);
  }

  const aiCard = findSchemaCardByCardId(messages, cardOrEditId);
  if (aiCard?.generatedTime?.trim()) {
    return formatHistoryPointTimeLabel(parseGeneratedTimeMs(aiCard.generatedTime));
  }

  const manualCard = findManualCardInMessages(messages, cardOrEditId);
  if (manualCard) {
    const matchedEdit = getManualEdits(manualCard).find((edit) => edit.editId === cardOrEditId);
    const generatedTime = matchedEdit?.generatedTime ?? manualCard.generatedTime;
    if (generatedTime?.trim()) {
      return formatHistoryPointTimeLabel(parseGeneratedTimeMs(generatedTime));
    }
  }

  return null;
}

/**
 * 通过 prevSchema 与历史条目比对，推断旧数据首条手动保存的来源时间
 * @param edit 手动保存的首条编辑记录
 * @param entries 全量历史条目
 * @returns 推断出的来源时间文本，无法推断时返回 null
 */
function inferSourceTimeFromPrevSchema(
  edit: ISchemaManualEditRecord,
  entries: ISchemaVersionHistoryEntry[],
): string | null {
  const prevSchema = edit.prevSchema?.trim();
  if (!prevSchema) {
    return null;
  }

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const schema = rebuildSchemaFromCard(entry.cardMessage);
    if (!schema) {
      continue;
    }
    if (JSON.stringify(schema) === prevSchema) {
      return formatHistoryPointTimeLabel(entry.createdAtMs);
    }
  }

  return null;
}

/**
 * 手动合并卡首条 edit 的历史描述：用时间指向来源版本（如「还原自 x 的版本」）
 * @param edit 首条编辑记录
 * @param entries 全量历史条目
 * @param messages 当前会话消息列表
 * @param options.isLatest 是否为该手动卡内最新 edit
 * @param options.isPending 是否仍在生成中
 * @returns 展示用描述
 */
function buildManualFirstEditDescription(
  edit: ISchemaManualEditRecord,
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
  options: { isLatest: boolean; isPending: boolean },
): string {
  if (options.isPending) {
    return '生成中...';
  }

  const sourceTime =
    (edit.sourceCardGeneratedTime?.trim()
      ? formatHistoryPointTimeLabel(parseGeneratedTimeMs(edit.sourceCardGeneratedTime))
      : null)
    || (edit.sourceCardId ? resolveCardVersionTimeLabel(entries, messages, edit.sourceCardId) : null)
    || inferSourceTimeFromPrevSchema(edit, entries);

  if (sourceTime) {
    return `还原自 ${sourceTime} 的版本`;
  }

  if (options.isLatest) {
    return '最近更新';
  }

  return edit.input?.trim() || '手动编辑保存';
}

/**
 * 根据卡片类型推断历史条目作者信息
 * @param card 版本卡片消息
 * @returns 作者标签与类型（用户 / AI）
 */
function buildAuthor(card: ISchemaCardLikeMessage): { authorLabel: string; authorType: 'user' | 'ai' } {
  if (card.type === 'schema-manual') {
    return { authorLabel: '用户', authorType: 'user' };
  }
  return { authorLabel: 'AI', authorType: 'ai' };
}

/**
 * 从会话消息收集全部 schema 版本记录（时间正序收集，展示时按时间倒序）
 * @param messages 当前会话消息列表
 * @param options.currentCardId 当前预览对应的 cardId 或手动编辑 editId
 * @param options.latestCardId 会话中最新版本的 cardId
 * @returns 历史版本条目列表
 */
export function collectSchemaVersionHistory(
  messages: ChatMessage[] | undefined,
  options: { currentCardId?: string; latestCardId?: string } = {},
): ISchemaVersionHistoryEntry[] {
  if (!messages?.length) {
    return [];
  }

  const entries: ISchemaVersionHistoryEntry[] = [];
  let sequenceIndex = 0;

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
        const edits = getManualEdits(manualCard);
        edits.forEach((edit, editIndex) => {
          const isPending = !edit.generatedTime?.trim();
          const snapshot = manualEditToCardSnapshot(manualCard, edit);
          if (!isPending && !isSchemaVersionHistoryCollectible(snapshot, messages)) {
            return;
          }
          const createdAtMs = parseGeneratedTimeMs(edit.generatedTime);
          const { authorLabel, authorType } = buildAuthor(manualCard);
          const isLastEdit = editIndex === edits.length - 1;

          entries.push({
            cardId: edit.editId,
            type: manualCard.type,
            input: edit.input ?? '',
            generatedTime: edit.generatedTime ?? '',
            createdAtMs,
            sequenceIndex: sequenceIndex++,
            timeLabel: isPending ? '刚刚' : formatHistoryTimeLabel(createdAtMs),
            description: '',
            authorLabel,
            authorType,
            isLatest: false,
            isCurrent:
              options.currentCardId === edit.editId
              || (options.currentCardId === manualCard.cardId && isLastEdit),
            isPending,
            cardMessage: snapshot,
          });
        });
        continue;
      }

      const isPending = !item.generatedTime?.trim();
      if (!isPending && !isSchemaVersionHistoryCollectible(item, messages)) {
        continue;
      }
      const createdAtMs = parseGeneratedTimeMs(item.generatedTime);
      const { authorLabel, authorType } = buildAuthor(item);

      entries.push({
        cardId: item.cardId,
        type: item.type,
        input: item.input ?? '',
        generatedTime: item.generatedTime ?? '',
        createdAtMs,
        sequenceIndex: sequenceIndex++,
        timeLabel: isPending ? '刚刚' : formatHistoryTimeLabel(createdAtMs),
        description: '',
        authorLabel,
        authorType,
        isLatest: false,
        isCurrent: item.cardId === options.currentCardId,
        isPending,
        cardMessage: item,
      });
    }
  }

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const latestCardId = options.latestCardId ?? latestEntry?.cardId ?? '';
  const latestSequenceIndex = latestEntry?.sequenceIndex ?? -1;

  return entries.map((entry) => {
    let isLatest = entry.sequenceIndex === latestSequenceIndex;
    if (!isLatest && entry.type === 'schema-manual') {
      const manualCard = entry.cardMessage as ISchemaManualMessageItem;
      if (manualCard.cardId === latestCardId) {
        const edits = getManualEdits(manualCard);
        isLatest = edits[edits.length - 1]?.editId === entry.cardId;
      }
    }
    return {
      ...entry,
      isLatest,
      description: buildDescription(entry.cardMessage, { isLatest, isPending: entry.isPending }),
    };
  });
}

/**
 * 将历史条目按时间分组，供历史面板展示
 * @param entries collectSchemaVersionHistory 的返回结果
 * @param nowMs 当前时间毫秒戳，默认 Date.now()
 * @returns 按时间分组的历史条目
 */
export function groupSchemaVersionHistory(
  entries: ISchemaVersionHistoryEntry[],
  nowMs: number = Date.now(),
): Array<{ label: string; items: ISchemaVersionHistoryEntry[] }> {
  const sorted = [...entries].sort((a, b) => b.sequenceIndex - a.sequenceIndex);
  const groupOrder: string[] = [];
  const buckets = new Map<string, ISchemaVersionHistoryEntry[]>();

  for (const entry of sorted) {
    const label = entry.isPending
      ? '今天'
      : getHistoryTimeGroupLabel(entry.createdAtMs, nowMs);
    if (!buckets.has(label)) {
      buckets.set(label, []);
      groupOrder.push(label);
    }
    buckets.get(label)!.push(entry);
  }

  return groupOrder.map((label) => ({
    label,
    items: buckets.get(label) ?? [],
  }));
}

/**
 * 将 cardId / editId 解析为聊天气泡级卡片 id（手动合并卡 cardId 或 AI 卡 cardId）
 * @param messages 当前会话消息列表
 * @param cardOrEditId 当前预览的 cardId 或手动编辑 editId
 * @returns 气泡级卡片 id，无法解析时返回空字符串
 */
export function resolveSchemaCardScopeId(
  messages: ChatMessage[] | undefined,
  cardOrEditId: string | undefined,
): string {
  if (!messages?.length || !cardOrEditId) {
    return '';
  }

  const manualCard = findManualCardInMessages(messages, cardOrEditId);
  if (manualCard) {
    return manualCard.cardId;
  }

  const aiCard = findSchemaCardByCardId(messages, cardOrEditId);
  if (aiCard) {
    return aiCard.cardId;
  }

  return cardOrEditId;
}

/**
 * 从全量历史条目中筛出与当前选中卡片相关的版本记录
 * - 手动合并卡：展示该卡内全部 edits
 * - schema-card / json-patch：仅展示当前这一条卡片
 * @param entries collectSchemaVersionHistory 的全量结果
 * @param messages 当前会话消息列表
 * @param scopeCardId 气泡级卡片 cardId
 * @param currentCardOrEditId 当前预览的 cardId 或手动编辑 editId
 * @returns 当前卡片范围内的历史条目
 */
export function filterSchemaVersionHistoryForCard(
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
  scopeCardId: string,
  currentCardOrEditId?: string,
): ISchemaVersionHistoryEntry[] {
  const lookupId = currentCardOrEditId || scopeCardId;
  if (!lookupId || !entries.length) {
    return [];
  }

  const manualCard = findManualCardInMessages(messages, lookupId);
  if (manualCard) {
    const edits = getManualEdits(manualCard);
    const editIds = new Set(edits.map((edit) => edit.editId));
    const scoped = entries.filter((entry) => editIds.has(entry.cardId));
    if (!scoped.length) {
      return [];
    }

    const collectible = scoped.filter((entry) =>
      entry.isPending || isSchemaVersionHistoryCollectible(entry.cardMessage, messages),
    );
    if (!collectible.length) {
      return [];
    }

    const latestInScopeId = [...collectible]
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
      .at(-1)
      ?.cardId;
    const firstEditId = edits[0]?.editId;

    return collectible.map((entry) => {
      const isLatestInScope = entry.cardId === latestInScopeId;
      const matchedEdit = edits.find((edit) => edit.editId === entry.cardId);
      const isFirstEdit = entry.cardId === firstEditId;
      const description = isFirstEdit && matchedEdit
        ? buildManualFirstEditDescription(matchedEdit, entries, messages, {
          isLatest: isLatestInScope,
          isPending: entry.isPending,
        })
        : buildDescription(entry.cardMessage, {
          isLatest: isLatestInScope,
          isPending: entry.isPending,
        });

      return {
        ...entry,
        isLatest: isLatestInScope,
        description,
      };
    });
  }

  const aiCardId = scopeCardId || lookupId;
  const scoped = entries.filter((entry) => entry.cardId === aiCardId || entry.cardId === lookupId);
  if (!scoped.length) {
    return [];
  }

  const collectible = scoped.filter((entry) =>
    entry.isPending || isSchemaVersionHistoryCollectible(entry.cardMessage, messages),
  );
  if (!collectible.length) {
    return [];
  }

  return collectible.map((entry) => ({
      ...entry,
      description: buildDescription(entry.cardMessage, {
        isLatest: entry.isLatest,
        isPending: entry.isPending,
      }),
    }));
}
