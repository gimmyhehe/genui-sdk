import { A2A_PROTOCOL_CONFIG } from '../config.js';
import type { A2aProtocolAdapter, A2aProtocolVersion } from '../types.js';
import { a2aProtocolAdapterV03 } from './v0_3.js';
import { a2aProtocolAdapterV10 } from './v1_0.js';

/** 全部已知适配器（按版本索引）。新增版本在此注册；弃用版本从此移除。 */
const ALL_ADAPTERS: A2aProtocolAdapter[] = [a2aProtocolAdapterV03, a2aProtocolAdapterV10];

/**
 * 根据 `A2A_PROTOCOL_CONFIG.supportedVersions` 构建当前启用的适配器表。
 *
 * @returns 版本 → 适配器 映射
 */
export function createEnabledAdapterMap(): Map<A2aProtocolVersion, A2aProtocolAdapter> {
  const enabled = new Set(A2A_PROTOCOL_CONFIG.supportedVersions);
  const map = new Map<A2aProtocolVersion, A2aProtocolAdapter>();

  for (const adapter of ALL_ADAPTERS) {
    if (enabled.has(adapter.version)) {
      map.set(adapter.version, adapter);
    }
  }

  return map;
}

/** 当前运行时启用的协议适配器（只读）。 */
export const enabledA2aProtocolAdapters = createEnabledAdapterMap();

/**
 * 获取指定版本的协议适配器。
 *
 * @param version - 协议主版本
 * @returns 适配器实例；未启用时返回 `undefined`
 */
export function getA2aProtocolAdapter(version: A2aProtocolVersion): A2aProtocolAdapter | undefined {
  return enabledA2aProtocolAdapters.get(version);
}
