import type { Request, Response as ExpressResponse } from 'express';
import getRawBody from 'raw-body';
import { isAllowedAgentUrl } from './agent-url-validation.js';
import { normalizeAgentCard } from './resolve-agent-api-url.js';

const isDevelopment = process.env.NODE_ENV === 'development';

/** 拉取远程 Agent Card 的单次请求超时（毫秒）。 */
const UPSTREAM_FETCH_TIMEOUT_MS = 10_000;

function sendAgentCardResponse(
  res: ExpressResponse,
  httpStatus: number,
  body: { data?: unknown; message?: string },
): void {
  res.status(httpStatus).json(body);
}

/**
 * 拉取远程 Agent Card URL。
 *
 * @param url - Agent Card 地址
 * @returns 上游 HTTP 响应
 */
async function fetchAgentCardUpstream(url: string): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 服务端代理拉取 Agent Card，规避浏览器跨域限制，并规范化 api.url 字段。
 *
 * @param req - Express 请求，body 为 `{ url: string }`
 * @param res - Express 响应，`{ data?, message? }`
 */
export const fetchAgentCardHandler = async (req: Request, res: ExpressResponse): Promise<void> => {
  try {
    const rawBody = await getRawBody(req, { encoding: 'utf-8', limit: '16kb' });
    const body = JSON.parse(rawBody);
    const requestedUrl = (body?.url || '').trim();

    if (!requestedUrl) {
      sendAgentCardResponse(res, 400, { message: '缺少 Agent Card URL' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(requestedUrl);
    } catch {
      sendAgentCardResponse(res, 400, { message: 'Agent Card URL 无效' });
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      sendAgentCardResponse(res, 400, { message: '仅支持 http/https 协议' });
      return;
    }

    if (!isDevelopment && !isAllowedAgentUrl(requestedUrl)) {
      sendAgentCardResponse(res, 403, { message: '不允许访问本地或内网地址' });
      return;
    }

    let fetchRes: globalThis.Response;
    try {
      fetchRes = await fetchAgentCardUpstream(requestedUrl);
    } catch (error: any) {
      const message = error?.name === 'AbortError' ? '获取 Agent Card 超时' : error?.message || String(error);
      sendAgentCardResponse(res, 502, { message });
      return;
    }

    const rawText = await fetchRes.text();

    if (!fetchRes.ok) {
      sendAgentCardResponse(res, fetchRes.status >= 400 ? fetchRes.status : 502, {
        message: rawText.trim() || `HTTP ${fetchRes.status} ${fetchRes.statusText}`.trim(),
      });
      return;
    }

    let card: unknown;
    try {
      card = rawText.trim() ? JSON.parse(rawText) : null;
    } catch {
      sendAgentCardResponse(res, 500, { message: 'Agent Card 响应不是有效 JSON' });
      return;
    }

    if (!card || typeof card !== 'object' || Array.isArray(card)) {
      sendAgentCardResponse(res, 500, { message: 'Agent Card 格式无效' });
      return;
    }

    const normalizedCard = normalizeAgentCard(card as Record<string, unknown>);
    sendAgentCardResponse(res, 200, { data: normalizedCard });
  } catch (error: any) {
    const message = error?.message || String(error);
    const httpStatus = error?.name === 'AgentCardProtocolError' ? 422 : 500;
    sendAgentCardResponse(res, httpStatus, { message });
  }
};
