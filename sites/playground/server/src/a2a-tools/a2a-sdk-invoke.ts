import type { PlaygroundAgentConfig } from './agent-tools.js';
import { a2aProtocolInvokeAdapterV03 } from './protocol/adapters/v0_3.js';
import { a2aProtocolInvokeAdapterV10 } from './protocol/adapters/v1_0.js';
import { toAgentCard } from './protocol/adapters/agent-card.js';
import type { A2aProtocolVersion } from './protocol/types.js';

/**
 * 按协议主版本选择对应的官方 SDK 适配层。
 *
 * @param version - 协议主版本
 * @returns 适配层实例，未知版本时返回 `undefined`
 */
function resolveInvokeAdapter(version: A2aProtocolVersion) {
  switch (version) {
    case '0.3':
      return a2aProtocolInvokeAdapterV03;
    case '1.0':
      return a2aProtocolInvokeAdapterV10;
    default:
      return undefined;
  }
}

/**
 * 通过协议适配层调用官方 @a2a-js/sdk（0.3 稳定版 / 1.0 alpha）。
 *
 * @param agent - Playground Agent 配置
 * @param version - 已解析的协议主版本
 * @param input - 用户自然语言输入
 * @param headers - HTTP 认证等请求头
 * @param abortSignal - 可选取消信号
 * @returns 成功返回 Agent 回复文本
 * @throws {Error} 协议版本无对应适配层或 SDK 调用失败
 */
export async function invokeAgentWithOfficialSdk(
  agent: PlaygroundAgentConfig,
  version: A2aProtocolVersion,
  input: string,
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const adapter = resolveInvokeAdapter(version);
  if (!adapter) {
    throw new Error(`不支持 A2A 协议版本 "${version}"`);
  }

  return adapter.sendMessage({
    agentCard: toAgentCard(agent),
    input,
    headers,
    abortSignal,
  });
}
