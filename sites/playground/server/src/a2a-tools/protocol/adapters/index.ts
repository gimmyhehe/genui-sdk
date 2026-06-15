import { A2A_PROTOCOL_CONFIG } from '../config.js';
import type { A2aProtocolAdapter, A2aProtocolVersion } from '../types.js';
import { a2aProtocolAdapterV03 } from './v0_3.js';
import { a2aProtocolAdapterV10 } from './v1_0.js';

const ALL_ADAPTERS: A2aProtocolAdapter[] = [a2aProtocolAdapterV03, a2aProtocolAdapterV10];

const adapterMap = new Map<A2aProtocolVersion, A2aProtocolAdapter>(
  ALL_ADAPTERS.filter((adapter) => A2A_PROTOCOL_CONFIG.supportedVersions.includes(adapter.version)).map(
    (adapter) => [adapter.version, adapter],
  ),
);

/**
 * 获取指定版本的协议适配器。
 *
 * @param version - 协议主版本
 * @returns 适配器实例；未启用时返回 `undefined`
 */
export function getA2aProtocolAdapter(version: A2aProtocolVersion): A2aProtocolAdapter | undefined {
  return adapterMap.get(version);
}
