import { ClientFactory } from '@a2a-js/sdk-v1/client';
import { buildMessageBodyV10 } from '../build-body.js';
import { buildSdkRequestOptions } from '../build-options.js';
import { extractA2aResponseText } from '../parse-response.js';

/**
 * 通过官方 SDK 1.0 Client 发起 SendMessage 并返回可读文本。
 *
 * @param agentCard - Agent Card 对象
 * @param input - 用户自然语言输入
 * @param headers - HTTP 请求头
 * @param abortSignal - 可选取消信号
 * @returns Agent 回复文本
 */
export async function sendA2aMessageV10(
  agentCard: Record<string, unknown>,
  input: string,
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const factory = new ClientFactory();
  const client = await factory.createFromAgentCard(agentCard as never);
  const result = await client.sendMessage(
    buildMessageBodyV10(input) as never,
    buildSdkRequestOptions(headers, abortSignal) as never,
  );
  return extractA2aResponseText(result);
}
