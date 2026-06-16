import { randomUUID } from 'node:crypto';

/**
 * 构造 A2A 0.3 SendMessage 请求体。
 *
 * @param input - 用户自然语言输入
 * @returns 0.3 SDK sendMessage 参数
 */
export function buildMessageBodyV03(input: string): Record<string, unknown> {
  return {
    message: {
      messageId: randomUUID(),
      role: 'user',
      parts: [{ kind: 'text', text: input }],
    },
  };
}

/**
 * 构造 A2A 1.0 SendMessage 请求体。
 *
 * @param input - 用户自然语言输入
 * @returns 1.0 SDK sendMessage 参数
 */
export function buildMessageBodyV10(input: string): Record<string, unknown> {
  return {
    message: {
      messageId: randomUUID(),
      role: 'ROLE_USER',
      parts: [{ text: input, mediaType: 'text/plain' }],
    },
  };
}
