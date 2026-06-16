import type { A2aProtocolVersion } from '../types.js';

/** 单次 SendMessage 适配调用上下文。 */
export type A2aInvokeAdapterContext = {
  agentCard: Record<string, unknown>;
  input: string;
  headers: Record<string, string>;
  abortSignal?: AbortSignal;
};

/**
 * A2A 协议版本适配层：封装官方 SDK 的 Client 创建与 SendMessage 调用。
 */
export interface A2aProtocolInvokeAdapter {
  readonly version: A2aProtocolVersion;

  /**
   * 向 Agent 发送 SendMessage 并返回可读文本。
   *
   * @param context - 调用上下文
   * @returns Agent 回复文本
   */
  sendMessage(context: A2aInvokeAdapterContext): Promise<string>;
}
