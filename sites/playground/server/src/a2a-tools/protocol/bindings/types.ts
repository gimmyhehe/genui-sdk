import type { A2aProtocolAdapter } from '../types.js';

/** 单次 A2A 调用尝试的结果。 */
export type A2aInvokeAttemptResult =
  | { ok: true; text: string }
  | { ok: false; message: string; status?: number; statusText?: string };

export type A2aBindingInvokeOptions = {
  baseUrl: string;
  adapter: A2aProtocolAdapter;
  input: string;
  headers: Record<string, string>;
  abortSignal?: AbortSignal;
};

/**
 * A2A binding 传输层契约（JSON-RPC / HTTP+JSON 等）。
 */
export interface A2aProtocolBindingTransport {
  readonly binding: import('../types.js').A2aProtocolBinding;

  /**
   * 通过当前 binding 向 Agent 发送 SendMessage 等价请求。
   *
   * @param options - 调用参数
   * @returns 尝试结果
   */
  invoke(options: A2aBindingInvokeOptions): Promise<A2aInvokeAttemptResult>;
}
