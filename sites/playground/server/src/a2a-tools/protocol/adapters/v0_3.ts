import { randomUUID } from 'node:crypto';
import { ClientFactory, ServiceParameters, type RequestOptions } from '@a2a-js/sdk/client';
import { extractA2aResponseText } from '../extract-response-text.js';
import type { A2aInvokeAdapterContext, A2aProtocolInvokeAdapter } from './types.js';

/**
 * 构造 A2A 0.3 SendMessage 请求体。
 *
 * @param input - 用户自然语言输入
 * @returns 0.3 SDK sendMessage 参数
 */
function buildSendMessageParams(input: string): Record<string, unknown> {
  return {
    message: {
      messageId: randomUUID(),
      role: 'user',
      parts: [{ kind: 'text', text: input }],
    },
  };
}

/**
 * 构造 0.3 SDK RequestOptions（认证头 + 取消信号）。
 *
 * @param headers - HTTP 头
 * @param abortSignal - 可选取消信号
 * @returns RequestOptions
 */
function buildRequestOptions(
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): RequestOptions {
  const serviceParameters =
    Object.keys(headers).length > 0
      ? ServiceParameters.createFrom(undefined, (params) => ({ ...params, ...headers }))
      : undefined;

  return {
    signal: abortSignal,
    serviceParameters,
  };
}

/** A2A 0.3 官方 SDK 适配层（@a2a-js/sdk 稳定版）。 */
export const a2aProtocolInvokeAdapterV03: A2aProtocolInvokeAdapter = {
  version: '0.3',

  async sendMessage(context: A2aInvokeAdapterContext): Promise<string> {
    const factory = new ClientFactory();
    const client = await factory.createFromAgentCard(context.agentCard as never);
    const result = await client.sendMessage(
      buildSendMessageParams(context.input) as never,
      buildRequestOptions(context.headers, context.abortSignal),
    );
    return extractA2aResponseText(result as Record<string, unknown>);
  },
};
