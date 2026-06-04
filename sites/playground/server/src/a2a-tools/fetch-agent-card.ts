import type { Request, Response } from 'express';
import getRawBody from 'raw-body';
import { isAllowedAgentUrl } from './agent-tools.js';
import { normalizeAgentCard } from './resolve-agent-api-url.js';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 服务端代理拉取 Agent Card，规避浏览器跨域限制，并规范化 api.url 字段。
 *
 * @param req - Express 请求，body 为 `{ url: string }`
 * @param res - Express 响应，`{ code, data?, message? }`
 */
export const fetchAgentCardHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = JSON.parse(await getRawBody(req, { encoding: 'utf-8' }));
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

    if (!isDevelopment && !isAllowedAgentUrl(requestedUrl)) {
      res.send({ code: 403, message: '不允许访问本地或内网地址' });
      return;
    }

    const fetchRes = await fetch(requestedUrl, {
      headers: { Accept: 'application/json' },
    });
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
