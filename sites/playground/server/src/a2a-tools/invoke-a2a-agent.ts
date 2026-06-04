import { randomUUID } from 'node:crypto';
import type { PlaygroundAgentConfig } from './agent-tools.js';
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
function buildA2aRequestHeaders(
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
 * 构造 A2A JSON-RPC 2.0 SendMessage 请求体。
 *
 * @param input - 用户自然语言输入
 * @returns JSON-RPC 请求对象
 */
function buildSendMessageRequest(input: string): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    id: randomUUID(),
    method: 'SendMessage',
    params: {
      message: {
        messageId: randomUUID(),
        role: 'user',
        parts: [{ kind: 'text', text: input }],
      },
    },
  };
}

/**
 * 从 A2A Part 对象中提取可读文本。
 */
function extractTextFromPart(part: unknown): string {
  if (!part || typeof part !== 'object') {
    return '';
  }
  const record = part as Record<string, unknown>;
  if (typeof record.text === 'string' && record.text.trim()) {
    return record.text;
  }
  if (typeof record.content === 'string' && record.content.trim()) {
    return record.content;
  }
  return '';
}

/**
 * 从 A2A JSON-RPC result 中提取 agent 回复文本（兼容多种返回结构）。
 */
function extractA2aResponseText(result: unknown): string {
  if (result == null) {
    return '';
  }
  if (typeof result === 'string') {
    return result;
  }
  if (typeof result !== 'object') {
    return String(result);
  }

  const record = result as Record<string, unknown>;
  const textParts: string[] = [];

  const collectParts = (parts: unknown) => {
    if (!Array.isArray(parts)) {
      return;
    }
    for (const part of parts) {
      const text = extractTextFromPart(part);
      if (text) {
        textParts.push(text);
      }
    }
  };

  if (record.message && typeof record.message === 'object') {
    collectParts((record.message as Record<string, unknown>).parts);
  }

  collectParts(record.parts);

  if (Array.isArray(record.artifacts)) {
    for (const artifact of record.artifacts) {
      if (artifact && typeof artifact === 'object') {
        collectParts((artifact as Record<string, unknown>).parts);
      }
    }
  }

  const status = record.status;
  if (status && typeof status === 'object') {
    const statusMessage = (status as Record<string, unknown>).message;
    if (statusMessage && typeof statusMessage === 'object') {
      collectParts((statusMessage as Record<string, unknown>).parts);
    }
  }

  if (textParts.length) {
    return textParts.join('\n');
  }

  return JSON.stringify(result);
}

/**
 * 调用 A2A Agent：通过 JSON-RPC SendMessage 与远程 Agent 交互。
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

  const headers = buildA2aRequestHeaders(agentRecord, metadata);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: abortSignal,
      body: JSON.stringify(buildSendMessageRequest(input)),
    });

    const rawText = await res.text();
    let payload: Record<string, unknown> | null = null;

    try {
      payload = rawText.trim() ? (JSON.parse(rawText) as Record<string, unknown>) : null;
    } catch {
      return {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        status: res.status,
        statusText: res.statusText,
        message: rawText.trim() || `HTTP ${res.status} ${res.statusText}`.trim(),
      };
    }

    if (!res.ok) {
      return {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        status: res.status,
        statusText: res.statusText,
        message: rawText.trim() || `HTTP ${res.status} ${res.statusText}`.trim(),
      };
    }

    const rpcError = payload?.error as { code?: number; message?: string } | undefined;
    if (rpcError) {
      return {
        type: 'agent-function-call-error',
        agent: { name: agent.name },
        message: rpcError.message || JSON.stringify(rpcError),
      };
    }

    if ('result' in (payload || {})) {
      const text = extractA2aResponseText(payload?.result);
      return {
        type: 'text',
        text: text || JSON.stringify(payload?.result),
      };
    }

    return {
      type: 'agent-function-call-error',
      agent: { name: agent.name },
      message: 'A2A 响应缺少 result 字段',
    };
  } catch (error: any) {
    const aborted = error?.name === 'AbortError' || abortSignal?.aborted;
    return {
      type: 'agent-function-call-error',
      agent: { name: agent.name },
      message: aborted ? 'Agent request was cancelled' : error?.message || String(error),
    };
  }
}
