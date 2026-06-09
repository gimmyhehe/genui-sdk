import type { AgentProtocolSource, A2aProtocolBinding } from './types.js';
import { resolveAgentInterface } from './supported-interfaces.js';

export { parseA2aProtocolBinding } from './parse-protocol.js';

/**
 * 从 Agent 配置解析 protocol binding。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns Card 声明的 binding
 */
export function resolveAgentProtocolBinding(
  source: AgentProtocolSource | null | undefined,
): A2aProtocolBinding {
  return resolveAgentInterface(source).binding;
}

/**
 * 拼接 Agent 接口基址与相对路径，生成完整请求 URL。
 *
 * @param baseUrl - Agent Card 中的接口 url
 * @param path - 相对路径（如 `message:send`）
 * @returns 绝对 URL
 */
export function joinAgentEndpointPath(baseUrl: string, path: string): string {
  const baseTrimmed = baseUrl.replace(/\/+$/, '');
  const pathTrimmed = path.replace(/^\/+/, '');
  return `${baseTrimmed}/${pathTrimmed}`;
}
