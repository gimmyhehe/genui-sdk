import type { LlmBenchmarkRunOptions } from '../framework/index';

/** 保序去重：后出现的重复 id 丢弃。 */
function dedupePreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * 生成与报告共用的模型列表：`models` 非空时用之（**保序去重**），否则 `[model]`。
 * @param options 运行配置
 * @returns 最终参与执行的模型 id 列表
 */
export function resolveModelsForBench(options: LlmBenchmarkRunOptions): string[] {
  const raw = options.models?.map((m) => m.trim()).filter(Boolean) ?? [];
  if (raw.length > 0) {
    return dedupePreserveOrder(raw);
  }
  return [options.model];
}

/**
 * 将模型名转换为适合文件名的短 slug。
 * @param model 原始模型名
 * @returns 文件安全的模型名（长度上限 96）
 */
export function slugifyModelForFilename(model: string): string {
  const s = model.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return (s || 'model').slice(0, 96);
}
