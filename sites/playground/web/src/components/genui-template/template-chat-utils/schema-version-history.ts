import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaCardLikeMessage } from './conversation-schema';
import { getManualEdits, manualEditToCardSnapshot } from './manual-schema';
import type { ISchemaManualMessageItem } from '../chat.types';

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

const startOfLocalDay = (timeMs: number) => {
  const d = new Date(timeMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

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

/**
 * 格式化历史条目展示用的时间标签（如「2026/06/01 20:33」）
 * @param createdAtMs 创建时间毫秒戳
 * @returns 展示用时间标签
 */
export function formatHistoryTimeLabel(createdAtMs: number): string {
  const d = new Date(createdAtMs);
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * 根据创建时间返回历史面板分组标签（今天 / 昨天 / 本月 / 更早）
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

  const created = new Date(createdAtMs);
  const now = new Date(nowMs);
  if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) {
    return '本月';
  }

  return '更早';
}

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
            cardMessage: manualEditToCardSnapshot(manualCard, edit),
          });
        });
        continue;
      }

      const isPending = !item.generatedTime?.trim();
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
