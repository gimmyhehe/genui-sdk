import { extractA2aInvokeResponseText } from '../extract-response-text.js';
import { readJsonResponse } from './read-json-response.js';
import type { A2aBindingInvokeOptions, A2aInvokeAttemptResult, A2aProtocolBindingTransport } from './types.js';

/**
 * 拼接 Agent 接口基址与相对路径，生成完整请求 URL。
 *
 * @param baseUrl - Agent Card 中的接口 url
 * @param path - 相对路径（如 `message:send`）
 * @returns 绝对 URL
 */
function joinAgentEndpointPath(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/**
 * HTTP+JSON binding：向 `{url}/{message:send}` 发送 REST POST。
 */
export const httpJsonBindingTransport: A2aProtocolBindingTransport = {
  binding: 'HTTP+JSON',

  async invoke(options: A2aBindingInvokeOptions): Promise<A2aInvokeAttemptResult> {
    const { baseUrl, adapter, input, headers, abortSignal } = options;
    const url = joinAgentEndpointPath(baseUrl, adapter.resolveHttpSendMessagePath(baseUrl));
    const requestHeaders = adapter.applyProtocolHeaders({
      ...headers,
      'Content-Type': 'application/a2a+json',
      Accept: 'application/a2a+json',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      signal: abortSignal,
      body: JSON.stringify(adapter.buildHttpJsonSendMessageBody(input)),
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

    const rpcStyleError = parsed.payload.error as { message?: string } | undefined;
    if (rpcStyleError && typeof rpcStyleError === 'object' && !('result' in parsed.payload)) {
      return {
        ok: false,
        message: rpcStyleError.message || JSON.stringify(rpcStyleError),
      };
    }

    return { ok: true, text: extractA2aInvokeResponseText(parsed.payload) };
  },
};
