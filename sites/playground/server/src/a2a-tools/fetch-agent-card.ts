import type { Request, Response as ExpressResponse } from 'express';
import getRawBody from 'raw-body';
import { isAllowedAgentUrl, isPlaygroundDevelopment } from './agent-url-validation.js';
import { normalizeAgentCard } from './protocol/supported-interfaces.js';

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

    try {
      new URL(requestedUrl);
    } catch {
      sendAgentCardResponse(res, 400, { message: 'Agent Card URL 无效' });
      return;
    }

    if (!isPlaygroundDevelopment && !isAllowedAgentUrl(requestedUrl)) {
      sendAgentCardResponse(res, 403, { message: '不允许访问本地或内网地址' });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_FETCH_TIMEOUT_MS);

    let fetchRes: globalThis.Response;
    try {
      fetchRes = await fetch(requestedUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error',
      });
    } catch (error: any) {
      const message = error?.name === 'AbortError' ? '获取 Agent Card 超时' : error?.message || String(error);
      sendAgentCardResponse(res, 502, { message });
      return;
    } finally {
      clearTimeout(timeoutId);
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
