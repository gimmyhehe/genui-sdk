/**
 * A2A Agent Card / Playground Agent 配置中端点 URL 的解析。
 */

import {
  AgentCardProtocolError,
  resolveAgentInterface,
  tryResolveAgentInterface,
} from './protocol/supported-interfaces.js';
import type { AgentProtocolSource } from './protocol/types.js';

export type AgentUrlSource = AgentProtocolSource;

export { AgentCardProtocolError };

/**
 * 从 Agent Card 或已保存的 Agent 配置中解析用于服务端调用的 API 基址。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 可用于 HTTP 调用的绝对 URL，无法解析时返回空字符串
 */
export function resolveAgentApiUrl(source: AgentUrlSource | null | undefined): string {
  return tryResolveAgentInterface(source)?.url ?? '';
}

/**
 * 将 Agent Card 规范化为 Playground 使用的结构，确保 api.url 已填充。
 *
 * @param card - 原始 Agent Card JSON
 * @returns 带 api 字段的 Agent Card 副本
 * @throws {AgentCardProtocolError} Card 不符合 A2A 协议
 */
export function normalizeAgentCard<T extends Record<string, unknown>>(
  card: T,
): T & { api: { url: string; type: string; version: string } } {
  const resolved = resolveAgentInterface(card as AgentUrlSource);
  const existingApi =
    card.api && typeof card.api === 'object' && !Array.isArray(card.api)
      ? (card.api as Record<string, unknown>)
      : {};

  return {
    ...card,
    api: {
      ...existingApi,
      url: resolved.url,
      type: resolved.binding,
      version: resolved.version,
    },
  };
}
