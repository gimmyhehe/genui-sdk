import { tool } from 'ai';
import { z } from 'zod';
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listSwaggerMcpToolEntries } from './instance.js';

function registeredToolToAiSdkTool(name: string, registered: RegisteredTool) {
  return tool({
    description: registered.description ?? name,
    inputSchema: registered.inputSchema ?? z.object({}),
    execute: async (args) => {
      const result = await registered.callback(
        args as Record<string, unknown>,
        { signal: undefined } as Parameters<RegisteredTool['callback']>[1],
      );
      return result.content;
    },
  });
}

/** 将内置 Swagger MCP 工具转为 AI SDK tools（无需在 Playground 配置外部 MCP 服务） */
export function buildSwaggerAiSdkTools(): Record<string, ReturnType<typeof tool>> {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const { name, registered } of listSwaggerMcpToolEntries()) {
    tools[name] = registeredToolToAiSdkTool(name, registered);
  }

  return tools;
}
