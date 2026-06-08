import { randomUUID } from 'node:crypto';
import type { A2aProtocolAdapter } from '../types.js';

/**
 * A2A 0.3 JSON-RPC 适配器。
 *
 * 弃用 0.3 支持时：删除本文件，并从 `adapters/index.ts` 移除注册即可。
 */
export const a2aProtocolAdapterV03: A2aProtocolAdapter = {
  version: '0.3',

  buildSendMessageRequest(input: string): Record<string, unknown> {
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

  applyProtocolHeaders(headers: Record<string, string>): Record<string, string> {
    return headers;
  },
};
