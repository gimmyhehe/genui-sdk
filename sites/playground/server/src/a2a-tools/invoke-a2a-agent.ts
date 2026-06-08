import type { PlaygroundAgentConfig } from './agent-tools.js';
import {
  extractA2aResponseText,
  getA2aProtocolAdapter,
  getProtocolVersionsToTry,
  isRetryableProtocolRpcError,
  resolveAgentProtocolVersion,
  type A2aProtocolVersion,
} from './protocol/index.js';
import { resolveAgentApiUrl } from './resolve-agent-api-url.js';

type AgentInvokeResult =
  | { type: 'text'; text: string }
  | { type: 'a2a-agent-error'; message: string }
  | {
      type: 'agent-function-call-error';
      agent: { name: string };
      status?: number;
      statusText?: string;
      message: string;
    };

type AgentAuthRecord = PlaygroundAgentConfig & {
  authentication?: { schemes?: string[] };
  securitySchemes?: Record<string, { httpAuthSecurityScheme?: { scheme?: string } }>;
};

type RpcAttemptResult =
  | { ok: true; text: string }
  | { ok: false; retryable: boolean; error: AgentInvokeResult };

/**
 * 从 Agent Card 或 metadata 推断认证方式（Bearer / API Key）。
 */
function inferAuthType(
  agent: AgentAuthRecord,
  metadata?: Record<string, unknown>,
): 'bearer' | 'api_key' | null {
  const explicit = (agent.auth?.type || (metadata?.authType as string) || '').toLowerCase();
  if (explicit === 'bearer') {
    return 'bearer';
  }
  if (explicit === 'api_key' || explicit === 'api-key') {
    return 'api_key';
  }

  const schemes = agent.authentication?.schemes;
  if (Array.isArray(schemes) && schemes.some((item) => String(item).toLowerCase() === 'bearer')) {
    return 'bearer';
  }

  const securitySchemes = agent.securitySchemes;
  if (securitySchemes && typeof securitySchemes === 'object') {
    for (const schemeDef of Object.values(securitySchemes)) {
      const scheme = schemeDef?.httpAuthSecurityScheme?.scheme?.toLowerCase();
      if (scheme === 'bearer') {
        return 'bearer';
      }
    }
  }

  return null;
}

/**
 * 构造 A2A JSON-RPC 请求所需的 HTTP 头（含可选 Bearer / API Key）。
 */
function buildBaseA2aRequestHeaders(
  agent: AgentAuthRecord,
  metadata?: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const token = (metadata?.token || metadata?.apiKey) as string | undefined;
  if (!token) {
    return headers;
  }

  const authType = inferAuthType(agent, metadata);
  if (authType === 'bearer') {
    headers.Authorization = `Bearer ${token}`;
  } else if (authType === 'api_key') {
    headers['x-api-key'] = token;
  }

  return headers;
}

/**
 * 使用指定协议适配器发起一次 A2A JSON-RPC 调用。
 *
 * @param agent - Playground Agent 配置
 * @param endpoint - RPC 端点 URL
 * @param input - 用户自然语言输入
 * @param version - 本次尝试的协议版本
 * @param baseHeaders - 基础 HTTP 头（认证等）
 * @param abortSignal - 可选取消信号
 * @returns 成功返回文本，失败时标记是否可 fallback 到其他已启用版本
 */
async function invokeA2aAgentOnce(
  agent: PlaygroundAgentConfig,
  endpoint: string,
  input: string,
  version: A2aProtocolVersion,
  baseHeaders: Record<string, string>,
  abortSignal?: AbortSignal,
): Promise<RpcAttemptResult> {
  const adapter = getA2aProtocolAdapter(version);
  if (!adapter) {
    return {
      ok: false,
      retryable: false,
      error: {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        message: `A2A 协议版本 ${version} 未启用`,
      },
    };
  }

  const headers = adapter.applyProtocolHeaders(baseHeaders);
  const body = adapter.buildSendMessageRequest(input);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
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
      retryable: false,
      error: {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        status: res.status,
        statusText: res.statusText,
        message: rawText.trim() || `HTTP ${res.status} ${res.statusText}`.trim(),
      },
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      retryable: false,
      error: {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        status: res.status,
        statusText: res.statusText,
        message: rawText.trim() || `HTTP ${res.status} ${res.statusText}`.trim(),
      },
    };
  }

  const rpcError = payload?.error as { code?: number; message?: string } | undefined;
  if (rpcError) {
    return {
      ok: false,
      retryable: isRetryableProtocolRpcError(rpcError),
      error: {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        message: rpcError.message || JSON.stringify(rpcError),
      },
    };
  }

  if ('result' in (payload || {})) {
    const text = extractA2aResponseText(payload?.result);
    return {
      ok: true,
      text: text || JSON.stringify(payload?.result),
    };
  }

  return {
    ok: false,
    retryable: false,
    error: {
      type: 'agent-function-call-error',
      agent: { name: agent.name },
      message: 'A2A 响应缺少 result 字段',
    },
  };
}

/**
 * 调用 A2A Agent：按 Card 推断协议版本，并在已启用版本间按需 fallback。
 *
 * @param agent - Playground Agent 配置
 * @param input - 要转交的自然语言任务
 * @param metadata - 可选 metadata（token、apiKey 等）
 * @param abortSignal - 可选取消信号
 * @returns 工具 execute 统一的返回结构
 */
export async function invokeA2aAgent(
  agent: PlaygroundAgentConfig,
  input: string,
  metadata?: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<AgentInvokeResult> {
  const endpoint = resolveAgentApiUrl(agent);
  const agentRecord = agent as AgentAuthRecord;

  if (!endpoint) {
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" 未配置可调用的 url，无法调用`,
    };
  }

  const preferredVersion = resolveAgentProtocolVersion(agent);
  const versionsToTry = getProtocolVersionsToTry(preferredVersion);
  const baseHeaders = buildBaseA2aRequestHeaders(agentRecord, metadata);

  let lastError: AgentInvokeResult | null = null;

  try {
    for (let index = 0; index < versionsToTry.length; index += 1) {
      const version = versionsToTry[index];
      const attempt = await invokeA2aAgentOnce(
        agent,
        endpoint,
        input,
        version,
        baseHeaders,
        abortSignal,
      );

      if (attempt.ok) {
        return { type: 'text', text: attempt.text };
      }

      lastError = attempt.error;
      const hasNextVersion = index < versionsToTry.length - 1;
      if (attempt.retryable && hasNextVersion) {
        continue;
      }

      return attempt.error;
    }

    return (
      lastError || {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        message: 'A2A 调用失败',
      }
    );
  } catch (error: any) {
    const aborted = error?.name === 'AbortError' || abortSignal?.aborted;
    return {
      type: 'agent-function-call-error',
      agent: { name: agent.name },
      message: aborted ? 'Agent request was cancelled' : error?.message || String(error),
    };
  }
}
