import { A2A_PROTOCOL_CONFIG } from './config.js';
import type { AgentInterfaceLike, AgentProtocolSource, A2aProtocolVersion } from './types.js';

/**
 * 从 Agent 配置中选取与调用端点对应的 supportedInterface。
 *
 * @param source - Agent Card 或 Playground Agent 配置
 * @returns 匹配到的接口声明，若无则返回 `undefined`
 */
function pickAgentInterface(source: AgentProtocolSource): AgentInterfaceLike | undefined {
  const interfaces = source.supportedInterfaces || source.supported_interfaces || [];
  const apiUrl = (source.api?.url || '').trim();

  if (apiUrl) {
    return interfaces.find((item) => item?.url === apiUrl) || interfaces.find((item) => item?.url);
  }

  return interfaces.find((item) => item?.url);
}

/**
 * 将 Agent Card 中的协议版本字符串解析为 Playground 支持的版本号。
 *
 * @param raw - 原始版本字符串（如 `0.3.0`、`1.0`）
 * @returns 解析成功返回 `'0.3'` 或 `'1.0'`，无法识别时返回 `null`
 */
export function parseA2aProtocolVersion(raw: string | undefined | null): A2aProtocolVersion | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('1')) {
    return '1.0';
  }

  if (normalized.startsWith('0')) {
    return '0.3';
  }

  return null;
}

/**
 * 将推断出的版本约束到当前启用的协议范围内。
 *
 * @param version - 从 Card 推断的版本
 * @returns 当前配置下可用的版本
 */
function clampToSupportedVersion(version: A2aProtocolVersion): A2aProtocolVersion {
  const { supportedVersions, defaultVersion } = A2A_PROTOCOL_CONFIG;

  if (supportedVersions.includes(version)) {
    return version;
  }

  if (supportedVersions.includes(defaultVersion)) {
    return defaultVersion;
  }

  return supportedVersions[supportedVersions.length - 1];
}

/**
 * 从 Agent Card 或 Playground Agent 配置中推断应使用的 A2A 协议版本。
 *
 * 优先级：`api.version` → `supportedInterfaces[].protocolVersion`
 * → 顶层 `protocolVersion` → 结构启发式 → `defaultVersion`。
 * 结果始终落在 `A2A_PROTOCOL_CONFIG.supportedVersions` 内。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns 当前启用的协议版本
 */
export function resolveAgentProtocolVersion(
  source: AgentProtocolSource | null | undefined,
): A2aProtocolVersion {
  const { defaultVersion } = A2A_PROTOCOL_CONFIG;

  if (!source) {
    return clampToSupportedVersion(defaultVersion);
  }

  const fromApi = parseA2aProtocolVersion(source.api?.version);
  if (fromApi) {
    return clampToSupportedVersion(fromApi);
  }

  const matchedInterface = pickAgentInterface(source);
  const fromInterface = parseA2aProtocolVersion(
    matchedInterface?.protocolVersion || matchedInterface?.protocol_version,
  );
  if (fromInterface) {
    return clampToSupportedVersion(fromInterface);
  }

  const fromTopLevel = parseA2aProtocolVersion(source.protocolVersion);
  if (fromTopLevel) {
    return clampToSupportedVersion(fromTopLevel);
  }

  const interfaces = source.supportedInterfaces || source.supported_interfaces || [];
  if (interfaces.length > 0 && !source.url) {
    return clampToSupportedVersion('1.0');
  }

  return clampToSupportedVersion(defaultVersion);
}

/**
 * 生成 Agent 调用时的协议版本尝试顺序（首选版本优先，可选 fallback）。
 *
 * @param preferred - 从 Agent Card 推断的首选版本（已 clamp 到启用范围）
 * @returns 去重后的版本列表，均来自 `supportedVersions`
 */
export function getProtocolVersionsToTry(preferred: A2aProtocolVersion): A2aProtocolVersion[] {
  const { supportedVersions, enableVersionFallback } = A2A_PROTOCOL_CONFIG;
  const enabled = supportedVersions.slice();

  if (!enabled.length) {
    return [preferred];
  }

  const primary = enabled.includes(preferred) ? preferred : enabled[0];

  if (!enableVersionFallback || enabled.length === 1) {
    return [primary];
  }

  const ordered: A2aProtocolVersion[] = [primary];
  for (const version of enabled) {
    if (version !== primary) {
      ordered.push(version);
    }
  }

  return ordered;
}
