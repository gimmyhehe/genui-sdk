import { extractA2aResponseText, summarizeUnresolvedA2aResult } from '../extract-response-text.js';

/**
 * 从 JSON-RPC 或 HTTP+JSON 响应体中提取业务结果文本。
 *
 * @param payload - 已解析的 JSON 响应
 * @returns 可读文本
 */
export function extractA2aInvokeResponseText(payload: Record<string, unknown> | null): string {
  if (!payload) {
    return '';
  }

  if ('result' in payload) {
    const text = extractA2aResponseText(payload.result);
    return text || summarizeUnresolvedA2aResult();
  }

  const text = extractA2aResponseText(payload);
  return text || summarizeUnresolvedA2aResult();
}
