import type { A2aBindingInvokeOptions, A2aInvokeAttemptResult, A2aProtocolBindingTransport } from './types.js';
import { extractA2aInvokeResponseText } from './parse-response.js';

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
    const body = adapter.buildJsonRpcSendMessageRequest(input);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: requestHeaders,
      signal: abortSignal,
      body: JSON.stringify(body),
    });

    const rawText = await res.text();
    let payload: Record<string, unknown> | null = null;

    try {
      payload = rawText.trim() ? (JSON.parse(rawText) as Record<string, unknown>) : null;
    } catch {
      return {
        ok: false,
        message: rawText.trim() || `HTTP ${res.status} ${res.statusText}`.trim(),
        status: res.status,
        statusText: res.statusText,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        message: rawText.trim() || `HTTP ${res.status} ${res.statusText}`.trim(),
        status: res.status,
        statusText: res.statusText,
      };
    }

    const rpcError = payload?.error as { code?: number; message?: string } | undefined;
    if (rpcError) {
      return {
        ok: false,
        message: rpcError.message || JSON.stringify(rpcError),
      };
    }

    if ('result' in (payload || {})) {
      return { ok: true, text: extractA2aInvokeResponseText(payload) };
    }

    return {
      ok: false,
      message: 'A2A JSON-RPC 响应缺少 result 字段',
    };
  },
};
