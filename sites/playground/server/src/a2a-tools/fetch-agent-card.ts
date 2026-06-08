import type { Request, Response as ExpressResponse } from 'express';
import getRawBody from 'raw-body';
import { isAllowedAgentUrlResolved } from './agent-url-validation.js';
import { normalizeAgentCard } from './resolve-agent-api-url.js';

const isDevelopment = process.env.NODE_ENV === 'development';

/** 拉取远程 Agent Card 的单次请求超时（毫秒）。 */
const UPSTREAM_FETCH_TIMEOUT_MS = 10_000;

/** 允许跟随的重定向最大跳数。 */
const MAX_REDIRECT_HOPS = 5;

/**
 * 在 SSRF 防护下拉取 URL，手动处理重定向并对每一跳重新校验。
 *
 * @param startUrl - 初始 URL
 * @param allowPrivate - 开发态是否允许内网地址
 * @returns 非重定向的最终 HTTP 响应
 */
async function fetchUrlWithRedirectGuard(
  startUrl: string,
  allowPrivate: boolean,
): Promise<globalThis.Response> {
  let currentUrl = startUrl;

  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_FETCH_TIMEOUT_MS);

    let response: globalThis.Response;
    try {
      response = await fetch(currentUrl, {
        headers: { Accept: 'application/json' },
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('重定向响应缺少 Location');
      }

      const nextUrl = new URL(location, currentUrl).toString();
      if (!allowPrivate && !(await isAllowedAgentUrlResolved(nextUrl))) {
        throw new Error('重定向到不允许访问的地址');
      }

      currentUrl = nextUrl;
      continue;
    }

    return response;
  }

  throw new Error('重定向次数过多');
}

/**
 * 服务端代理拉取 Agent Card，规避浏览器跨域限制，并规范化 api.url 字段。
 *
 * @param req - Express 请求，body 为 `{ url: string }`
 * @param res - Express 响应，`{ code, data?, message? }`
 */
export const fetchAgentCardHandler = async (req: Request, res: ExpressResponse): Promise<void> => {
  try {
    const rawBody = await getRawBody(req, { encoding: 'utf-8', limit: '16kb' });
    const body = JSON.parse(rawBody);
    const requestedUrl = (body?.url || '').trim();

    if (!requestedUrl) {
      res.send({ code: 400, message: '缺少 Agent Card URL' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(requestedUrl);
    } catch {
      res.send({ code: 400, message: 'Agent Card URL 无效' });
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      res.send({ code: 400, message: '仅支持 http/https 协议' });
      return;
    }

    if (!isDevelopment && !(await isAllowedAgentUrlResolved(requestedUrl))) {
      res.send({ code: 403, message: '不允许访问本地或内网地址' });
      return;
    }

    let fetchRes: globalThis.Response;
    try {
      fetchRes = await fetchUrlWithRedirectGuard(requestedUrl, isDevelopment);
    } catch (error: any) {
      const message = error?.name === 'AbortError' ? '获取 Agent Card 超时' : error?.message || String(error);
      res.send({ code: 502, message });
      return;
    }

    const rawText = await fetchRes.text();

    if (!fetchRes.ok) {
      res.send({
        code: fetchRes.status,
        message: rawText.trim() || `HTTP ${fetchRes.status} ${fetchRes.statusText}`.trim(),
      });
      return;
    }

    let card: unknown;
    try {
      card = rawText.trim() ? JSON.parse(rawText) : null;
    } catch {
      res.send({ code: 500, message: 'Agent Card 响应不是有效 JSON' });
      return;
    }

    if (!card || typeof card !== 'object' || Array.isArray(card)) {
      res.send({ code: 500, message: 'Agent Card 格式无效' });
      return;
    }

    const normalizedCard = normalizeAgentCard(card as Record<string, unknown>);
    const apiUrl = (normalizedCard.api?.url || '').trim();

    if (!apiUrl) {
      res.send({ code: 500, message: 'Agent Card 中缺少可调用的 url / api.url / supportedInterfaces' });
      return;
    }

    res.send({ code: 200, data: normalizedCard });
  } catch (error: any) {
    res.send({ code: 500, message: error?.message || String(error) });
  }
};
