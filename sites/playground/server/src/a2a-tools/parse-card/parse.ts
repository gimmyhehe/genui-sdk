import {
  A2A_PROTOCOL_CONFIG,
  type AgentInterfaceLike,
  type AgentProtocolSource,
  type A2aProtocolBinding,
  type A2aProtocolVersion,
} from './types.js';

/** 解析后的 Agent 调用上下文。 */
export type ResolvedAgentInterface = {
  url: string;
  binding: A2aProtocolBinding;
  version: A2aProtocolVersion;
};

/** Agent Card 不符合 A2A 协议规范时抛出。 */
export class AgentCardProtocolError extends Error {
  constructor(detail: string) {
    super(`不符合 A2A 协议规范：${detail}`);
    this.name = 'AgentCardProtocolError';
  }
}

/**
 * 将 Agent Card 中的 protocolBinding 字符串规范化为 Playground 支持的标准 binding。
 *
 * @param raw - 原始 binding 字符串
 * @returns 规范化后的 binding，无法识别时返回 `null`
 */
function parseA2aProtocolBinding(raw: string | undefined | null): A2aProtocolBinding | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (normalized === 'JSONRPC') {
    return 'JSONRPC';
  }
  if (normalized === 'HTTP+JSON') {
    return 'HTTP+JSON';
  }

  return null;
}

/**
 * 将 Agent Card 中的协议版本字符串解析为 Playground 支持的版本号。
 *
 * @param raw - 原始版本字符串（如 `0.3.0`、`1.0`）
 * @returns 解析成功返回 `'0.3'` 或 `'1.0'`，无法识别时返回 `null`
 */
function parseA2aProtocolVersion(raw: string | undefined | null): A2aProtocolVersion | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === '1.0' || normalized.startsWith('1.0.') || normalized === '1') {
    return '1.0';
  }

  if (normalized === '0.3' || normalized.startsWith('0.3.')) {
    return '0.3';
  }

  return null;
}

/**
 * 安全地将未知值转为 trim 后的 URL 字符串。
 *
 * @param value - 原始字段值
 * @returns 合法字符串 URL，否则空字符串
 */
function trimUrlString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 按协议版本解析 Client 实际使用的 binding。
 * 0.3 固定 JSONRPC；1.0 使用 Card 声明的 JSONRPC / HTTP+JSON。
 *
 * @param version - 协议主版本
 * @param parsedBinding - Card 中声明的 binding，未声明时为 `null`
 * @returns Client 将使用的 binding，该版本不支持时返回 `null`
 */
function resolveClientBinding(
  version: A2aProtocolVersion,
  parsedBinding: A2aProtocolBinding | null,
): A2aProtocolBinding | null {
  if (version === '0.3') {
    return 'JSONRPC';
  }

  return parsedBinding;
}

/**
 * 校验单个 supportedInterface 是否为 Client 支持的传输组合（§8.3.2）。
 *
 * @param item - AgentInterface 条目
 * @returns 解析成功返回调用上下文，否则 `null`
 */
function parseClientSupportedInterface(item: AgentInterfaceLike): ResolvedAgentInterface | null {
  const url = trimUrlString(item?.url);
  if (!url) {
    return null;
  }

  const version = parseA2aProtocolVersion(item.protocolVersion || item.protocol_version);
  if (!version || !A2A_PROTOCOL_CONFIG.supportedVersions.includes(version)) {
    return null;
  }

  const parsedBinding = parseA2aProtocolBinding(item.protocolBinding || item.protocol_binding);
  const binding = resolveClientBinding(version, parsedBinding);
  if (!binding) {
    return null;
  }

  return { url, binding, version };
}

/**
 * 解析 A2A 0.3 旧版 Agent Card（顶层 url + protocolVersion + preferredTransport）。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 调用上下文
 * @throws {AgentCardProtocolError} Card 不符合 A2A 0.3 结构
 */
function resolveLegacyAgentInterface(source: AgentProtocolSource): ResolvedAgentInterface {
  const legacyUrl = trimUrlString(source.url) || trimUrlString(source.api?.url);
  if (!legacyUrl) {
    throw new AgentCardProtocolError('缺少 supportedInterfaces 或可调用的 url');
  }

  const rawVersion = source.api?.version ?? source.protocolVersion;
  let version = parseA2aProtocolVersion(
    typeof rawVersion === 'string' ? rawVersion : undefined,
  );
  if (!version) {
    const hasExplicitVersion =
      rawVersion !== undefined &&
      rawVersion !== null &&
      String(rawVersion).trim() !== '';
    if (hasExplicitVersion) {
      throw new AgentCardProtocolError('缺少有效的 protocolVersion');
    }
    // 升级兼容：旧 Playground 仅保存 api.url 时按 A2A 0.3 处理
    version = '0.3';
  }

  if (version === '1.0') {
    throw new AgentCardProtocolError('A2A 1.0 Card 缺少 supportedInterfaces');
  }

  const rawBinding = source.api?.type ?? source.preferredTransport;
  const parsedBinding = parseA2aProtocolBinding(
    typeof rawBinding === 'string' ? rawBinding : undefined,
  );
  const binding = resolveClientBinding(version, parsedBinding);
  if (!binding) {
    throw new AgentCardProtocolError('缺少 protocolBinding 或 preferredTransport');
  }

  return { url: legacyUrl, binding, version };
}

/**
 * 解析 Agent 调用接口（§8.3.2：按 supportedInterfaces 顺序取第一个 Client 支持的项）。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 调用上下文
 * @throws {AgentCardProtocolError} Card 不符合 A2A 协议规范
 */
export function resolveAgentInterface(
  source: AgentProtocolSource | null | undefined,
): ResolvedAgentInterface {
  if (!source) {
    throw new AgentCardProtocolError('Agent 配置为空');
  }

  const hasInterfacesField =
    Array.isArray(source.supportedInterfaces) || Array.isArray(source.supported_interfaces);
  const interfaces = source.supportedInterfaces || source.supported_interfaces || [];

  if (hasInterfacesField) {
    if (interfaces.length === 0) {
      throw new AgentCardProtocolError('supportedInterfaces 为空');
    }

    for (const item of interfaces) {
      const resolved = parseClientSupportedInterface(item);
      if (resolved) {
        return resolved;
      }
    }

    throw new AgentCardProtocolError(
      'supportedInterfaces 中无 Client 支持的 A2A 接口，请检查 url、protocolBinding、protocolVersion',
    );
  }

  return resolveLegacyAgentInterface(source);
}

/**
 * 从 Agent Card 或已保存的 Agent 配置中解析用于服务端调用的 API 基址。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 可用于 HTTP 调用的绝对 URL，无法解析时返回空字符串
 */
export function resolveAgentApiUrl(source: AgentProtocolSource | null | undefined): string {
  try {
    return resolveAgentInterface(source).url;
  } catch (error) {
    if (error instanceof AgentCardProtocolError) {
      return '';
    }
    throw error;
  }
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
  const resolved = resolveAgentInterface(card as AgentProtocolSource);
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
