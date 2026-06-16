import type { PlaygroundAgentConfig } from '../../agent-tools.js';

/**
 * 将 Playground Agent 配置转为官方 SDK 可用的 Agent Card 对象。
 *
 * @param agent - Playground Agent 配置（含 Agent Card 字段）
 * @returns Agent Card 对象
 */
export function toAgentCard(agent: PlaygroundAgentConfig): Record<string, unknown> {
  const { agentCardUrl: _agentCardUrl, enabled: _enabled, ...card } = agent;
  return card as Record<string, unknown>;
}
