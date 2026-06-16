import { randomUUID } from 'node:crypto';
import {
  ClientFactory,
  ServiceParameters,
  type RequestOptions,
} from '@a2a-js/sdk-v1/client';
import { extractA2aResponseText } from '../extract-response-text.js';
import type { A2aInvokeAdapterContext, A2aProtocolInvokeAdapter } from './types.js';

/**
 * 构造 A2A 1.0 SendMessage 请求体。
 *
 * @param input - 用户自然语言输入
 * @returns 1.0 SDK sendMessage 参数
 */
function buildSendMessageParams(input: string): Record<string, unknown> {
  return {
    message: {
      messageId: randomUUID(),
      role: 'ROLE_USER',
      parts: [{ text: input, mediaType: 'text/plain' }],
    },
  };
}

/**
 * 构造 1.0 SDK RequestOptions（认证头 + 取消信号）。
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

/** A2A 1.0 官方 SDK 适配层（@a2a-js/sdk-v1 / alpha）。 */
export const a2aProtocolInvokeAdapterV10: A2aProtocolInvokeAdapter = {
  version: '1.0',

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
