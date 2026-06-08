/**
 * A2A Agent Card / Playground Agent 配置中端点 URL 的解析。
 *
 * A2A 1.0 规范中，Agent Card 通过 `supportedInterfaces` 声明端点：
 * - 每个 AgentInterface 包含 `url`、`protocolBinding`、`protocolVersion`
 * - 列表按优先级排序，首个即为首选
 *
 * Playground 内部约定：normalizeAgentCard 会将解析结果写入 `api.url`，
 * 因此 `api.url` 始终是最高优先级来源。
 */

import { resolveAgentProtocolVersion } from './protocol/index.js';

type AgentInterfaceLike = {
  url?: string;
  protocolBinding?: string;
  protocol_binding?: string;
  protocolVersion?: string;
  protocol_version?: string;
};

export type AgentUrlSource = {
  api?: { url?: string; type?: string; version?: string };
  supportedInterfaces?: AgentInterfaceLike[];
  supported_interfaces?: AgentInterfaceLike[];
  protocolVersion?: string;
  url?: string;
};

/**
 * 从 Agent Card 或已保存的 Agent 配置中解析用于服务端调用的 API 基址。
 * 优先级：api.url（Playground 内部约定）→ supportedInterfaces 中首个带 url 的接口。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 可用于 HTTP 调用的绝对 URL，无法解析时返回空字符串
 */
export function resolveAgentApiUrl(source: AgentUrlSource | null | undefined): string {
  if (!source) {
    return '';
  }

  // Playground 内部约定：normalizeAgentCard 已将解析结果写入 api.url
  const fromApi = (source.api?.url || '').trim();
  if (fromApi) {
    return fromApi;
  }

  // A2A 规范：supportedInterfaces 按优先级排序，取首个有 url 的
  const interfaces = source.supportedInterfaces || source.supported_interfaces || [];
  const first = interfaces.find((item) => item?.url);
  return first ? first.url.trim() : '';
}

/**
 * 将 Agent Card 规范化为 Playground 使用的结构，确保 api.url 已填充。
 *
 * @param card - 原始 Agent Card JSON
 * @returns 带 api.url 的 Agent Card 副本
 */
export function normalizeAgentCard<T extends Record<string, unknown>>(
  card: T,
): T & { api: { url: string; type: string; version: string } } {
  const apiUrl = resolveAgentApiUrl(card as AgentUrlSource);
  const existingApi =
    card.api && typeof card.api === 'object' && !Array.isArray(card.api)
      ? (card.api as Record<string, unknown>)
      : {};

  const interfaces = (card.supportedInterfaces || card.supported_interfaces || []) as AgentInterfaceLike[];
  const matchedInterface =
    interfaces.find((item) => item?.url === apiUrl);

  const protocolBinding = matchedInterface?.protocolBinding || matchedInterface?.protocol_binding;
  const apiType =
    (existingApi.type as string | undefined) ||
    (typeof protocolBinding === 'string' ? protocolBinding : undefined) ||
    'JSONRPC';
  const protocolVersion = resolveAgentProtocolVersion(card as AgentUrlSource);

  return {
    ...card,
    api: {
      ...existingApi,
      url: apiUrl,
      type: apiType,
      version: protocolVersion,
    },
  };
}
