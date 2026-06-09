import type { AgentProtocolSource, A2aProtocolVersion } from './types.js';
import { parseA2aProtocolVersion } from './parse-protocol.js';
import { resolveAgentInterface } from './supported-interfaces.js';

export { parseA2aProtocolVersion } from './parse-protocol.js';

/**
 * 从 Agent 配置解析 A2A 协议版本。
 *
 * @param source - Agent Card JSON 或 Playground Agent 配置
 * @returns Card 声明的 protocolVersion
 */
export function resolveAgentProtocolVersion(
  source: AgentProtocolSource | null | undefined,
): A2aProtocolVersion {
  return resolveAgentInterface(source).version;
}
