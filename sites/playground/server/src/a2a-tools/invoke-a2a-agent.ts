import type { PlaygroundAgentConfig } from './agent-tools.js';
import { isAllowedAgentUrlResolved } from './agent-url-validation.js';
import { AgentCardProtocolError, resolveAgentInterface } from './protocol/index.js';

const isDevelopment = process.env.NODE_ENV === 'development';

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

/**
 * 从 Agent Card 或 metadata 推断认证方式（Bearer / API Key）。
 */
function inferAuthType(
  agent: PlaygroundAgentConfig,
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
 * 构造 A2A 请求所需的 HTTP 头（含可选 Bearer / API Key）。
 */
function buildBaseA2aRequestHeaders(
  agent: PlaygroundAgentConfig,
  metadata?: Record<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {
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
 * 调用 A2A Agent：解析唯一接口，经 binding 传输层 + 版本适配层发起单次请求。
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
  let resolved;
  try {
    resolved = resolveAgentInterface(agent);
  } catch (error) {
    const message =
      error instanceof AgentCardProtocolError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" ${message}`,
    };
  }

  const { url, adapter, transport } = resolved;

  if (!isDevelopment && !(await isAllowedAgentUrlResolved(url))) {
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" 的 url 不允许访问（已拦截本地或内网地址）`,
    };
  }

  const baseHeaders = buildBaseA2aRequestHeaders(agent, metadata);

  try {
    const attempt = await transport.invoke({
      baseUrl: url,
      adapter,
      input,
      headers: baseHeaders,
      abortSignal,
    });

    if (attempt.ok === false) {
      return {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        status: attempt.status,
        statusText: attempt.statusText,
        message: attempt.message,
      };
    }

    return { type: 'text', text: attempt.text };
  } catch (error: any) {
    const aborted = error?.name === 'AbortError' || abortSignal?.aborted;
    return {
      type: 'agent-function-call-error',
      agent: { name: agent.name },
      message: aborted ? 'Agent request was cancelled' : error?.message || String(error),
    };
  }
}
