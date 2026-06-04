import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IMessageItem } from '../chat.types';

/**
 * 用户在 SchemaJSON 编辑器中手动保存的版本消息（非对话输入）
 * @param message 会话消息
 * @returns 是否为手动保存的版本消息
 */
export function isManualSchemaSaveMessage(message: ChatMessage): boolean {
  if (message.role !== 'user') {
    return false;
  }
  const items = (message as { messages?: IMessageItem[] }).messages;
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }
  return items.every((item) => item.type === 'schema-manual');
}

/**
 * 将单条会话消息转为后端可消费格式，手动保存版本消息返回 null
 * @param message 原始会话消息
 * @returns 后端消息，或需排除时返回 null
 */
function toBackendChatMessage(message: ChatMessage): ChatMessage | null {
  if (isManualSchemaSaveMessage(message)) {
    return null;
  }
  const { type, ...rest } = message as ChatMessage & { type?: string };
  return rest as ChatMessage;
}

/**
 * 发给后端的对话消息：排除手动保存的版本消息
 * @param messages 完整会话消息列表
 * @returns 过滤后的后端消息列表
 */
export function getBackendChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .map(toBackendChatMessage)
    .filter((message): message is ChatMessage => message !== null);
}

/**
 * 反向查找最近一条真实用户输入消息（排除手动保存版本消息）
 * @param messages 完整会话消息列表
 * @returns 最近一条用户消息，未找到时返回 undefined
 */
export function getLastUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && !isManualSchemaSaveMessage(messages[i])) {
      return messages[i];
    }
  }
  return undefined;
}
