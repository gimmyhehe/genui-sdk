import type { PlaygroundAgentConfig } from './agent-tools.js';
import { isAllowedAgentUrl } from './agent-url-validation.js';
import { getA2aBindingTransport } from './protocol/bindings/index.js';
import {
  getA2aProtocolAdapter,
  getProtocolBindingsToTry,
  getProtocolVersionsToTry,
  resolveAgentProtocolBinding,
  resolveAgentProtocolVersion,
} from './protocol/index.js';
import { resolveAgentApiUrl } from './resolve-agent-api-url.js';

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
 * 调用 A2A Agent：按 Card 选择 binding 与协议版本，并在失败时自动 fallback。
 *
 * Fallback 顺序：同一 binding 内先 exhaust 全部版本，再切换 binding（见内层/外层循环）。
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

  if (!endpoint) {
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" 未配置可调用的 url，无法调用`,
    };
  }

  if (!isDevelopment && !isAllowedAgentUrl(endpoint)) {
    return {
      type: 'a2a-agent-error',
      message: `Agent "${agent.name}" 的 url 不允许访问（已拦截本地或内网地址）`,
    };
  }

  const preferredBinding = resolveAgentProtocolBinding(agent);
  const preferredVersion = resolveAgentProtocolVersion(agent);
  const bindingsToTry = getProtocolBindingsToTry(preferredBinding);
  const versionsToTry = getProtocolVersionsToTry(preferredVersion);
  const baseHeaders = buildBaseA2aRequestHeaders(agent, metadata);

  let lastError: AgentInvokeResult | null = null;

  try {
    for (const binding of bindingsToTry) {
      const transport = getA2aBindingTransport(binding);
      if (!transport) {
        continue;
      }

      for (let versionIndex = 0; versionIndex < versionsToTry.length; versionIndex += 1) {
        const version = versionsToTry[versionIndex];
        const adapter = getA2aProtocolAdapter(version);
        if (!adapter) {
          continue;
        }

        const attempt = await transport.invoke({
          baseUrl: endpoint,
          adapter,
          input,
          headers: baseHeaders,
          abortSignal,
        });

        if (attempt.ok) {
          return { type: 'text', text: attempt.text };
        }

        lastError = {
          type: 'agent-function-call-error',
          agent: { name: agent.name },
          status: attempt.status,
          statusText: attempt.statusText,
          message: attempt.message,
        };

        const hasNextVersion = versionIndex < versionsToTry.length - 1;
        if (attempt.retryable && hasNextVersion) {
          continue;
        }

        const bindingIndex = bindingsToTry.indexOf(binding);
        const hasNextBinding = bindingIndex < bindingsToTry.length - 1;
        if (attempt.retryable && hasNextBinding) {
          break;
        }

        return lastError;
      }
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
