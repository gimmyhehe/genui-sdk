/** 与 TrHistory 等列表分组标题一致的顺序与文案 */
export const TIME_BUCKET_LABELS = ['今天', '昨天', '两天前', '一周前', '一个月前'] as const;

export type TimeBucketLabel = (typeof TIME_BUCKET_LABELS)[number];

const MS_PER_DAY = 86400000;

export const startOfLocalDay = (timeMs: number) => {
  const d = new Date(timeMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const calendarDayDiffFromToday = (createdAtMs: number, nowMs: number) => {
  const todayStart = startOfLocalDay(nowMs);
  const dayStart = startOfLocalDay(createdAtMs);
  return Math.round((todayStart - dayStart) / MS_PER_DAY);
};

/**
 * 按本地日历日，根据 `createdAt` 归入「今天 / 昨天 / …」。
 * 无合法 `createdAt` 时归入「一个月前」。
 */
export const timeBucketLabelForCreatedAt = (createdAt: unknown, nowMs: number = Date.now()): TimeBucketLabel => {
  if (typeof createdAt !== 'number' || Number.isNaN(createdAt)) {
    return '一个月前';
  }

  const dayDiff = calendarDayDiffFromToday(createdAt, nowMs);
  if (dayDiff <= 0) {
    return '今天';
  }
  if (dayDiff === 1) {
    return '昨天';
  }
  if (dayDiff === 2) {
    return '两天前';
  }
  if (dayDiff < 7) {
    return '一周前';
  }
  return '一个月前';
};

type WithCreatedAt = { createdAt?: unknown };

/**
 * 将会话或模板等列表按时间桶拆分；仅返回非空分组。
 * 组内顺序与入参 `items` 的遍历顺序一致。
 */
export const groupByTimeBuckets = <T extends WithCreatedAt>(
  items: readonly T[],
  options?: { nowMs?: number },
): Array<{ group: TimeBucketLabel; items: T[] }> => {
  const nowMs = options?.nowMs ?? Date.now();

  const buckets: Record<TimeBucketLabel, T[]> = {
    今天: [],
    昨天: [],
    两天前: [],
    一周前: [],
    一个月前: [],
  };

  for (const item of items) {
    buckets[timeBucketLabelForCreatedAt(item.createdAt, nowMs)].push(item);
  }

  return TIME_BUCKET_LABELS.filter((label) => buckets[label].length > 0).map((label) => ({
    group: label,
    items: [...buckets[label]],
  }));
};
