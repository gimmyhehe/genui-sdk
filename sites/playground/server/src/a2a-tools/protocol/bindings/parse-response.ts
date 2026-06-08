import { extractA2aResponseText } from '../extract-response-text.js';

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
    return text || JSON.stringify(payload.result);
  }

  const text = extractA2aResponseText(payload);
  return text || JSON.stringify(payload);
}

/**
 * 判断 HTTP+JSON binding 的错误是否值得切换到 JSON-RPC 重试。
 *
 * @param status - HTTP 状态码
 * @param payload - 响应 JSON（若有）
 * @returns 是否建议 fallback
 */
export function isRetryableHttpJsonError(
  status: number,
  payload: Record<string, unknown> | null,
): boolean {
  if (status === 404 || status === 405) {
    return true;
  }

  const error = payload?.error;
  if (error && typeof error === 'object') {
    const code = (error as Record<string, unknown>).code;
    if (code === 'not_found' || code === 'method_not_found') {
      return true;
    }
  }

  return false;
}
