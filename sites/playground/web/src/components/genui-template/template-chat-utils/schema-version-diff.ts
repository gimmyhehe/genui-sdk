import type { ISchemaVersionHistoryEntry } from './schema-version-history';
import { parseSchemaJson, rebuildSchemaFromCard } from './conversation-schema';

/**
 * 递归移除 null 占位，diff 展示时兼容旧版本历史数据
 * @param value 待处理的 schema 或字段值
 * @returns 剔除 null 后的值
 */
function stripNullPlaceholders(value: unknown): unknown {
  if (value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stripNullPlaceholders(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === null) {
        continue;
      }
      const cleaned = stripNullPlaceholders(val);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return value;
}

/**
 * 将 schema 格式化为 diff 对比用 JSON 文本（剔除 null 占位）
 * @param value 待格式化的 schema 对象
 * @returns 格式化后的 JSON 字符串
 */
function stringifySchemaForDiff(value: unknown): string {
  const cleaned = stripNullPlaceholders(value);
  if (cleaned === undefined) {
    return '{}';
  }
  return JSON.stringify(cleaned, null, 2);
}

/**
 * 解析历史版本 diff 左侧基准（上一版 schema JSON 文本）
 * @param entry 当前选中的历史条目
 * @param entries 全部历史条目（用于 prevSchema 缺失时按时间回溯上一版）
 * @returns 格式化后的 JSON 文本
 */
export function resolveSchemaVersionDiffOriginal(
  entry: ISchemaVersionHistoryEntry,
  entries: ISchemaVersionHistoryEntry[],
): string {
  const card = entry.cardMessage;

  if (card.prevSchema?.trim()) {
    const parsed = parseSchemaJson(card.prevSchema);
    if (parsed) {
      return stringifySchemaForDiff(parsed);
    }
  }

  const sorted = [...entries].sort((a, b) => a.createdAtMs - b.createdAtMs);
  const index = sorted.findIndex((item) => item.cardId === entry.cardId);
  if (index > 0) {
    const prevSchema = rebuildSchemaFromCard(sorted[index - 1].cardMessage);
    if (prevSchema) {
      return stringifySchemaForDiff(prevSchema);
    }
  }

  return '{}';
}

/**
 * 解析历史版本 diff 右侧目标（当前选中版 schema JSON 文本）
 * @param entry 当前选中的历史条目
 * @returns 格式化后的 JSON 文本
 */
export function resolveSchemaVersionDiffModified(entry: ISchemaVersionHistoryEntry): string {
  const schema = rebuildSchemaFromCard(entry.cardMessage);
  if (schema) {
    return stringifySchemaForDiff(schema);
  }

  if (entry.cardMessage.schema?.trim()) {
    const parsed = parseSchemaJson(entry.cardMessage.schema);
    if (parsed) {
      return stringifySchemaForDiff(parsed);
    }
    return entry.cardMessage.schema;
  }

  return '{}';
}

/**
 * 判断两版 schema JSON 文本是否存在差异
 * @param original diff 左侧 JSON 文本
 * @param modified diff 右侧 JSON 文本
 * @returns true 时展示 Monaco DiffEditor，否则展示只读 JSON
 */
export function hasUnifiedDiffChanges(original: string, modified: string): boolean {
  return original !== modified;
}
