import { A2A_PROTOCOL_CONFIG } from './config.js';
import type { AgentProtocolSource, A2aProtocolBinding } from './types.js';

/**
 * 将 Agent Card 中的 protocolBinding 字符串规范化为 Playground 支持的 binding。
 *
 * @param raw - 原始 binding 字符串
 * @returns 规范化后的 binding，无法识别时返回 `null`
 */
export function parseA2aProtocolBinding(raw: string | undefined | null): A2aProtocolBinding | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (normalized === 'JSONRPC') {
    return 'JSONRPC';
  }
  if (normalized === 'HTTP+JSON' || normalized === 'HTTPJSON' || normalized === 'REST') {
    return 'HTTP+JSON';
  }

  return null;
}

/**
 * 从 Agent Card 或 Playground Agent 配置中推断 protocol binding。
 *
 * 优先级：`api.type` → 匹配端点的 `supportedInterfaces[].protocolBinding` → 默认 `JSONRPC`。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 当前支持的 binding
 */
export function resolveAgentProtocolBinding(
  source: AgentProtocolSource | null | undefined,
): A2aProtocolBinding {
  const { supportedBindings } = A2A_PROTOCOL_CONFIG;
  const fallback = supportedBindings.includes('JSONRPC') ? 'JSONRPC' : supportedBindings[0];

  if (!source) {
    return fallback;
  }

  const fromApi = parseA2aProtocolBinding(source.api?.type);
  if (fromApi && supportedBindings.includes(fromApi)) {
    return fromApi;
  }

  const apiUrl = (source.api?.url || '').trim();
  const interfaces = source.supportedInterfaces || source.supported_interfaces || [];
  const matched =
    interfaces.find((item) => item?.url === apiUrl) || interfaces.find((item) => item?.url);
  const fromInterface = parseA2aProtocolBinding(
    matched?.protocolBinding || matched?.protocol_binding,
  );
  if (fromInterface && supportedBindings.includes(fromInterface)) {
    return fromInterface;
  }

  const legacyTransport = (source as { preferredTransport?: string }).preferredTransport;
  const fromLegacy = parseA2aProtocolBinding(legacyTransport);
  if (fromLegacy && supportedBindings.includes(fromLegacy)) {
    return fromLegacy;
  }

  return fallback;
}

/**
 * 生成 Agent 调用时的 binding 尝试顺序（Card 声明优先，其余 binding 作 fallback）。
 *
 * @param preferred - 从 Agent Card 推断的首选 binding
 * @returns 去重后的 binding 列表
 */
export function getProtocolBindingsToTry(preferred: A2aProtocolBinding): A2aProtocolBinding[] {
  const { supportedBindings, enableBindingFallback } = A2A_PROTOCOL_CONFIG;
  const enabled = supportedBindings.slice();

  if (!enabled.length) {
    return [preferred];
  }

  const primary = enabled.includes(preferred) ? preferred : enabled[0];

  if (!enableBindingFallback || enabled.length === 1) {
    return [primary];
  }

  const ordered: A2aProtocolBinding[] = [primary];
  for (const binding of enabled) {
    if (binding !== primary) {
      ordered.push(binding);
    }
  }

  return ordered;
}

/**
 * 拼接 Agent 接口基址与相对路径，生成完整请求 URL。
 *
 * @param baseUrl - Agent Card 中的 api.url
 * @param path - 相对路径（如 `message:send`）
 * @returns 绝对 URL
 */
export function joinAgentEndpointPath(baseUrl: string, path: string): string {
  const baseTrimmed = baseUrl.replace(/\/+$/, '');
  const pathTrimmed = path.replace(/^\/+/, '');
  return `${baseTrimmed}/${pathTrimmed}`;
}
