import { getA2aProtocolAdapter } from './adapters/index.js';
import type {
  AgentInterfaceLike,
  AgentProtocolSource,
  A2aProtocolAdapter,
  A2aProtocolBinding,
  A2aProtocolVersion,
} from './types.js';
import { getA2aBindingTransport } from './bindings/index.js';
import type { A2aProtocolBindingTransport } from './bindings/types.js';
import { A2A_PROTOCOL_CONFIG } from './config.js';
import { parseA2aProtocolBinding, parseA2aProtocolVersion } from './parse-protocol.js';

/** 解析后的 Agent 调用上下文。 */
export type ResolvedAgentInterface = {
  url: string;
  binding: A2aProtocolBinding;
  version: A2aProtocolVersion;
  adapter: A2aProtocolAdapter;
  transport: A2aProtocolBindingTransport;
};

/** Agent Card 不符合 A2A 协议规范时抛出。 */
export class AgentCardProtocolError extends Error {
  constructor(detail: string) {
    super(`不符合 A2A 协议规范：${detail}`);
    this.name = 'AgentCardProtocolError';
  }
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
 * 绑定协议适配层与 binding 传输层。
 *
 * @param url - 接口 url
 * @param binding - protocolBinding
 * @param version - protocolVersion
 * @returns 完整调用上下文
 * @throws {AgentCardProtocolError} 无法映射适配层或传输层
 */
function attachProtocolRuntime(
  url: string,
  binding: A2aProtocolBinding,
  version: A2aProtocolVersion,
): ResolvedAgentInterface {
  const adapter = getA2aProtocolAdapter(version);
  if (!adapter) {
    throw new AgentCardProtocolError(
      `protocolVersion "${version}" 无法映射到 A2A 协议适配层`,
    );
  }

  const transport = getA2aBindingTransport(binding);
  if (!transport) {
    throw new AgentCardProtocolError(`protocolBinding "${binding}" 无法映射到 A2A 传输层`);
  }

  return { url, binding, version, adapter, transport };
}

/**
 * 判断 Client 是否支持该 binding 与 protocolVersion 组合。
 *
 * @param binding - 标准 protocolBinding
 * @param version - 标准 protocolVersion
 * @returns 是否支持
 */
function isClientSupportedTransport(
  binding: A2aProtocolBinding,
  version: A2aProtocolVersion,
): boolean {
  const { supportedBindings, supportedVersions } = A2A_PROTOCOL_CONFIG;
  return supportedBindings.includes(binding) && supportedVersions.includes(version);
}

/**
 * 校验单个 supportedInterface 是否为 Client 支持的传输组合（§8.3.2）。
 *
 * @param item - AgentInterface 条目
 * @returns 解析成功返回调用上下文，否则 `null`（Client 不支持或必填字段无效）
 */
function parseClientSupportedInterface(item: AgentInterfaceLike): ResolvedAgentInterface | null {
  const url = trimUrlString(item?.url);
  if (!url) {
    return null;
  }

  const binding = parseA2aProtocolBinding(item.protocolBinding || item.protocol_binding);
  const version = parseA2aProtocolVersion(item.protocolVersion || item.protocol_version);
  if (!binding || !version) {
    return null;
  }

  if (!isClientSupportedTransport(binding, version)) {
    return null;
  }

  return attachProtocolRuntime(url, binding, version);
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

  const version = parseA2aProtocolVersion(source.api?.version || source.protocolVersion);
  if (!version) {
    throw new AgentCardProtocolError('缺少有效的 protocolVersion');
  }

  if (version === '1.0') {
    throw new AgentCardProtocolError('A2A 1.0 Card 缺少 supportedInterfaces');
  }

  const binding = parseA2aProtocolBinding(source.api?.type || source.preferredTransport);
  if (!binding) {
    throw new AgentCardProtocolError('缺少 protocolBinding 或 preferredTransport');
  }

  if (!isClientSupportedTransport(binding, version)) {
    throw new AgentCardProtocolError(
      `protocolBinding "${binding}" 与 protocolVersion "${version}" 不在 Client 支持范围内`,
    );
  }

  return attachProtocolRuntime(legacyUrl, binding, version);
}

/**
 * 解析 Agent 调用接口（§8.3.2：按 supportedInterfaces 顺序取第一个 Client 支持的项；
 * 规范允许多条声明，Client 应优先选用列表中靠前的可支持项）。
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
 * 尝试解析 Agent 调用接口；不符合协议时返回 `null` 而不抛错。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 解析成功返回接口，否则 `null`
 */
export function tryResolveAgentInterface(
  source: AgentProtocolSource | null | undefined,
): ResolvedAgentInterface | null {
  try {
    return resolveAgentInterface(source);
  } catch (error) {
    if (error instanceof AgentCardProtocolError) {
      return null;
    }
    throw error;
  }
}
