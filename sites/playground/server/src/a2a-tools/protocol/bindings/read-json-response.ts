/** 解析 Agent HTTP 响应 JSON 的结果。 */
export type ReadJsonResponseResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; message: string; status: number; statusText: string };

/**
 * 读取 HTTP 响应体并解析为 JSON；非 2xx 或解析失败时返回错误信息。
 *
 * @param res - fetch 响应
 * @returns 解析结果
 */
export async function readJsonResponse(res: Response): Promise<ReadJsonResponseResult> {
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

  return { ok: true, payload: payload ?? {} };
}
