import { extractA2aInvokeResponseText } from '../extract-response-text.js';
import { readJsonResponse } from './read-json-response.js';
import type { A2aBindingInvokeOptions, A2aInvokeAttemptResult, A2aProtocolBindingTransport } from './types.js';

/**
 * JSON-RPC binding：向接口 url 发送 JSON-RPC 2.0 POST。
 */
export const jsonRpcBindingTransport: A2aProtocolBindingTransport = {
  binding: 'JSONRPC',

  async invoke(options: A2aBindingInvokeOptions): Promise<A2aInvokeAttemptResult> {
    const { baseUrl, adapter, input, headers, abortSignal } = options;
    const requestHeaders = adapter.applyProtocolHeaders({
      ...headers,
      'Content-Type': 'application/json',
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: requestHeaders,
      signal: abortSignal,
      body: JSON.stringify(adapter.buildJsonRpcSendMessageRequest(input)),
    });

    const parsed = await readJsonResponse(res);
    if (!parsed.ok) {
      return {
        ok: false,
        message: parsed.message,
        status: parsed.status,
        statusText: parsed.statusText,
      };
    }

    const rpcError = parsed.payload.error as { message?: string } | undefined;
    if (rpcError) {
      return {
        ok: false,
        message: rpcError.message || JSON.stringify(rpcError),
      };
    }

    if ('result' in parsed.payload) {
      return { ok: true, text: extractA2aInvokeResponseText(parsed.payload) };
    }

    return {
      ok: false,
      message: 'A2A JSON-RPC 响应缺少 result 字段',
    };
  },
};
