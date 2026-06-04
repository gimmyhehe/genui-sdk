import { tool } from 'ai';
import net from 'node:net';
import { z } from 'zod';
import { invokeA2aAgent } from './invoke-a2a-agent.js';

export type PlaygroundAgentConfig = {
  // 前端 IAgentConfig 字段（从 playground.metadata 直接透传）
  name: string;
  agentCardUrl: string;
  description?: string;
  enabled?: boolean;

  // Agent Card 解析后在服务端扩展的字段（可选）
  version?: string;
  api?: {
    type?: string;
    url?: string;
    version?: string;
  };
  auth?: {
    type?: string;
    instructions?: string;
  };
  capabilities?: string[];
};

/** 为 Agent 生成稳定的 ASCII tool 名称，只包含 [a-zA-Z0-9_-]。 */
const slugifyAgentName = (name: string, index: number): string => {
  const base = (name || '')
    .trim()
    // 替换非 ASCII 字符为下划线
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    // 去掉头尾的下划线
    .replace(/^_+|_+$/g, '') || 'agent';

  // 加上索引，避免不同 Agent 之间因为名称相同导致冲突
  return `agent_${base}_${index}`;
};

/** 判断 host 是否为本地/内网地址（只做显式阻断，非完整 RFC 覆盖）。 */
const isPrivateOrLocalHost = (host: string): boolean => {
  const lower = host.toLowerCase();

  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') {
    return true;
  }

  const ipVersion = net.isIP(host);
  if (!ipVersion) {
    return false;
  }

  // 仅处理常见的 IPv4 内网网段
  if (ipVersion === 4) {
    const [a, b] = host.split('.').map((v) => Number(v));

    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // 链路本地
  }

  // 简单拦截常见的 IPv6 私有地址前缀
  if (ipVersion === 6) {
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  }

  return false;
};

/** 校验 Agent 的 api.url，仅允许公网 http/https 目标。 */
export const isAllowedAgentUrl = (urlStr: string): boolean => {
  try {
    const u = new URL(urlStr);

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }

    if (isPrivateOrLocalHost(u.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

export const buildAgentTools = (
  agents: PlaygroundAgentConfig[] | undefined,
  abortSignal?: AbortSignal,
): Record<string, any> => {
  const agentTools: Record<string, any> = {};

  if (!Array.isArray(agents) || !agents.length) {
    return agentTools;
  }

  agents.forEach((agent, index) => {
    if (!agent?.name) {
      return;
    }

    const toolName = slugifyAgentName(agent.name, index);

    agentTools[toolName] = tool({
      description:
        agent.description ||
        `调用 A2A Agent "${agent.name}"。该 Agent 通过 A2A 接口提供能力，具体由前端或上游系统处理。`,
      // 这里使用一个统一的入参结构，由模型选择要交给 Agent 执行的任务内容
      inputSchema: z.object({
        input: z
          .string()
          .describe('要转交给该 Agent 处理的自然语言请求或任务描述'),
        metadata: z
          .record(z.any())
          .optional()
          .describe('可选的附加元数据，将一并发送给 Agent'),
      }),
      execute: async (args: any) => {
        return invokeA2aAgent(agent, args?.input ?? '', args?.metadata ?? {}, abortSignal);
      },
    });
  });

  return agentTools;
};
