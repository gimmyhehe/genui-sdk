import type { A2aProtocolVersion } from '../../parse-card/types.js';
import type { PlaygroundAgentConfig } from '../../types.js';
import { sendA2aMessageV03 } from './adapters/v0_3.js';
import { sendA2aMessageV10 } from './adapters/v1_0.js';

/**
 * 将 Playground Agent 配置转为官方 SDK 可用的 Agent Card 对象。
 *
 * @param agent - Playground Agent 配置（含 Agent Card 字段）
 * @returns Agent Card 对象
 */
function toAgentCard(agent: PlaygroundAgentConfig): Record<string, unknown> {
  const { agentCardUrl: _agentCardUrl, enabled: _enabled, ...card } = agent;
  return card as Record<string, unknown>;
}

/**
 * 通过官方 @a2a-js/sdk（0.3 稳定版 / 1.0 alpha）发起 SendMessage。
 *
 * @param agent - Playground Agent 配置
 * @param version - 已解析的协议主版本
 * @param input - 用户自然语言输入
 * @param headers - HTTP 认证等请求头
 * @param abortSignal - 可选取消信号
 * @returns 成功返回 Agent 回复文本
 * @throws {Error} 协议版本不支持或 SDK 调用失败
 */
export async function invokeAgentWithOfficialSdk(
  agent: PlaygroundAgentConfig,
  version: A2aProtocolVersion,
  input: string,
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const agentCard = toAgentCard(agent);

  switch (version) {
    case '0.3':
      return sendA2aMessageV03(agentCard, input, headers, abortSignal);
    case '1.0':
      return sendA2aMessageV10(agentCard, input, headers, abortSignal);
    default:
      throw new Error(`不支持 A2A 协议版本 "${version}"`);
  }
}
