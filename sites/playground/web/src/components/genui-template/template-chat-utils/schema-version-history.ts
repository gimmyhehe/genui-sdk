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

const startOfLocalWeek = (timeMs: number) => {
  const dayStart = startOfLocalDay(timeMs);
  const day = new Date(dayStart).getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  return dayStart - daysFromMonday * MS_PER_DAY;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

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

function filterCollectibleHistoryEntries(
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
): ISchemaVersionHistoryEntry[] {
  return entries.filter((entry) =>
    entry.isPending || isSchemaVersionHistoryCollectible(entry.cardMessage, messages),
  );
}

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

function inferSourceTimeFromPrevSchema(
  edit: ISchemaManualEditRecord,
  entries: ISchemaVersionHistoryEntry[],
  messages?: ChatMessage[],
): string | null {
  const prevSchema = edit.prevSchema?.trim();
  if (!prevSchema) {
    return null;
  }

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const schema = rebuildSchemaFromCard(entry.cardMessage, { messages });
    if (!schema) {
      continue;
    }
    if (JSON.stringify(schema) === prevSchema) {
      return formatHistoryPointTimeLabel(entry.createdAtMs);
    }
  }

  return null;
}

function buildManualRestoreDescription(
  edit: ISchemaManualEditRecord,
  entries: ISchemaVersionHistoryEntry[],
  messages: ChatMessage[] | undefined,
  options: { isLatest: boolean; isPending: boolean; allowPrevSchemaInfer?: boolean },
): string {
  if (options.isPending) {
    return '生成中...';
  }

  let sourceTime: string | null = null;
  if (edit.sourceCardGeneratedTime?.trim()) {
    sourceTime = formatHistoryPointTimeLabel(parseGeneratedTimeMs(edit.sourceCardGeneratedTime));
  } else if (edit.sourceCardId) {
    sourceTime = resolveCardVersionTimeLabel(entries, messages, edit.sourceCardId);
  } else if (options.allowPrevSchemaInfer) {
    sourceTime = inferSourceTimeFromPrevSchema(edit, entries, messages);
  }

  if (sourceTime) {
    return `应用自 ${sourceTime} 的版本`;
  }

  const hasExplicitSource = Boolean(edit.sourceCardId?.trim() || edit.sourceCardGeneratedTime?.trim());
  if (hasExplicitSource) {
    return '应用自历史版本';
  }

  if (options.isLatest) {
    return '最近更新';
  }

  return edit.input?.trim() || '手动编辑保存';
}

function buildAuthor(card: ISchemaCardLikeMessage): { authorLabel: string; authorType: 'user' | 'ai' } {
  if (card.type === 'schema-manual') {
    return { authorLabel: '用户', authorType: 'user' };
  }
  return { authorLabel: 'AI', authorType: 'ai' };
}

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
            timeLabel: isPending ? '刚刚' : formatHistoryPointTimeLabel(createdAtMs),
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
        timeLabel: isPending ? '刚刚' : formatHistoryPointTimeLabel(createdAtMs),
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

    const collectible = filterCollectibleHistoryEntries(scoped, messages);
    if (!collectible.length) {
      return [];
    }

    const latestInScopeId = collectible.at(-1)?.cardId;
    const firstEditId = edits[0]?.editId;

    return collectible.map((entry) => {
      const isLatestInScope = entry.cardId === latestInScopeId;
      const matchedEdit = edits.find((edit) => edit.editId === entry.cardId);
      const isFirstEdit = entry.cardId === firstEditId;
      const hasSourceInfo = Boolean(
        matchedEdit?.sourceCardId?.trim() || matchedEdit?.sourceCardGeneratedTime?.trim(),
      );
      const description = (isFirstEdit || hasSourceInfo) && matchedEdit
        ? buildManualRestoreDescription(matchedEdit, entries, messages, {
          isLatest: isLatestInScope,
          isPending: entry.isPending,
          allowPrevSchemaInfer: isFirstEdit,
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

  const scoped = entries.filter((entry) => entry.cardId === lookupId);
  if (!scoped.length) {
    return [];
  }

  return filterCollectibleHistoryEntries(scoped, messages);
}
