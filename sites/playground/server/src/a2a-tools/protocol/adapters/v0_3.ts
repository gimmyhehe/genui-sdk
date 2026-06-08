import { randomUUID } from 'node:crypto';
import type { A2aProtocolAdapter } from '../types.js';

/**
 * A2A 0.3 JSON-RPC / HTTP+JSON 适配器。
 *
 * 弃用 0.3 支持时：删除本文件，并从 `adapters/index.ts` 移除注册即可。
 */
export const a2aProtocolAdapterV03: A2aProtocolAdapter = {
  version: '0.3',

  buildJsonRpcSendMessageRequest(input: string): Record<string, unknown> {
    return {
      jsonrpc: '2.0',
      id: randomUUID(),
      method: 'message/send',
      params: {
        message: {
          messageId: randomUUID(),
          role: 'user',
          parts: [{ kind: 'text', text: input }],
        },
      },
    };
  },

  buildHttpJsonSendMessageBody(input: string): Record<string, unknown> {
    return {
      message: {
        messageId: randomUUID(),
        role: 'user',
        parts: [{ kind: 'text', text: input }],
      },
    };
  },

  /**
   * 解析 A2A 0.3 HTTP+JSON SendMessage 路径。
   * 若 api.url 已含 `/v1` 等版本段，则不再追加 `v1/` 前缀。
   */
  resolveHttpSendMessagePath(baseUrl: string): string {
    if (/\/v\d+(?:\.\d+)*\/?$/i.test(baseUrl)) {
      return 'message:send';
    }
    return 'v1/message:send';
  },

  applyProtocolHeaders(headers: Record<string, string>): Record<string, string> {
    return headers;
  },
};
