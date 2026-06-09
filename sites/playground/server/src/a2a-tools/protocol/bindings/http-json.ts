import { joinAgentEndpointPath } from '../resolve-protocol-binding.js';
import { extractA2aInvokeResponseText } from './parse-response.js';
import type { A2aBindingInvokeOptions, A2aInvokeAttemptResult, A2aProtocolBindingTransport } from './types.js';

/**
 * HTTP+JSON binding：向 `{url}/{message:send}` 发送 REST POST。
 */
export const httpJsonBindingTransport: A2aProtocolBindingTransport = {
  binding: 'HTTP+JSON',

  async invoke(options: A2aBindingInvokeOptions): Promise<A2aInvokeAttemptResult> {
    const { baseUrl, adapter, input, headers, abortSignal } = options;
    const path = adapter.resolveHttpSendMessagePath(baseUrl);
    const url = joinAgentEndpointPath(baseUrl, path);
    const body = adapter.buildHttpJsonSendMessageBody(input);
    const requestHeaders = adapter.applyProtocolHeaders({
      ...headers,
      'Content-Type': 'application/a2a+json',
      Accept: 'application/a2a+json',
    });

    const res = await fetch(url, {
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

    const rpcStyleError = payload?.error as { message?: string } | undefined;
    if (rpcStyleError && typeof rpcStyleError === 'object' && !('result' in (payload || {}))) {
      return {
        ok: false,
        message: rpcStyleError.message || JSON.stringify(rpcStyleError),
      };
    }

    return { ok: true, text: extractA2aInvokeResponseText(payload) };
  },
};
