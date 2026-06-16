import { AgentCardProtocolError, resolveAgentInterface } from '../parse-card/parse.js';
import type { PlaygroundAgentConfig } from '../types.js';
import { isAllowedAgentUrl, isPlaygroundDevelopment } from '../guard-agent-url/guard.js';
import { buildA2aRequestHeaders } from './request/build-headers.js';
import { invokeAgentWithOfficialSdk } from './send-message/invoke.js';

/** Agent tool execute 的统一返回结构。 */
export type AgentInvokeResult =
  | { type: 'text'; text: string }
  | { type: 'a2a-agent-error'; message: string }
  | {
      type: 'agent-function-call-error';
      agent: { name: string };
      message: string;
    };

/**
 * 调用 A2A Agent：解析接口 → 校验 URL → 构造请求头 → 经官方 SDK 发起 SendMessage。
 *
 * @param agent - Playground Agent 配置
 * @param input - 要转交的自然语言任务
 * @param metadata - 可选 metadata（token、apiKey 等）
 * @param abortSignal - 可选取消信号
 * @returns 工具 execute 统一的返回结构
 */
export async function invokeA2aAgent(
  agent: PlaygroundAgentConfig,
  input: string,
  metadata?: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<AgentInvokeResult> {
  let resolved;
  try {
    resolved = resolveAgentInterface(agent);
  } catch (error) {
    const message =
      error instanceof AgentCardProtocolError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" ${message}`,
    };
  }

  const { url, version } = resolved;

  if (!isPlaygroundDevelopment && !isAllowedAgentUrl(url)) {
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" 的 url 不允许访问（已拦截本地或内网地址）`,
    };
  }

  const headers = buildA2aRequestHeaders(agent, metadata);

  try {
    const text = await invokeAgentWithOfficialSdk(
      agent,
      version,
      input,
      headers,
      abortSignal,
    );
    return { type: 'text', text };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    const aborted = err?.name === 'AbortError' || abortSignal?.aborted;
    return {
      type: 'agent-function-call-error',
      agent: { name: agent.name },
      message: aborted ? 'Agent request was cancelled' : err?.message || String(error),
    };
  }
}
