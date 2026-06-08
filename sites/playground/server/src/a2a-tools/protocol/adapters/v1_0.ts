import { randomUUID } from 'node:crypto';
import type { A2aProtocolAdapter } from '../types.js';

/** A2A 1.0 规范要求的 HTTP 版本头取值。 */
const A2A_VERSION_HEADER = '1.0';

/**
 * A2A 1.0 JSON-RPC 适配器。
 */
export const a2aProtocolAdapterV10: A2aProtocolAdapter = {
  version: '1.0',

  buildSendMessageRequest(input: string): Record<string, unknown> {
    return {
      jsonrpc: '2.0',
      id: randomUUID(),
      method: 'SendMessage',
      params: {
        message: {
          messageId: randomUUID(),
          role: 'ROLE_USER',
          parts: [{ text: input, mediaType: 'text/plain' }],
        },
      },
    };
  },

  applyProtocolHeaders(headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      'A2A-Version': A2A_VERSION_HEADER,
    };
  },
};
