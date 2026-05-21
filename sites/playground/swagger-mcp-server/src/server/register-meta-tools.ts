import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SwaggerMcpConfig } from '../types.js';
import { parseSwaggerInput } from '../swagger/parse-swagger-input.js';
import type { SwaggerToolRegistry } from './swagger-tool-registry.js';

function parseOptionalHeaders(
  value?: Record<string, string> | string,
): Record<string, string> | undefined {
  if (!value) return undefined;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    const headers: Record<string, string> = {};
    for (const line of value.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key) headers[key] = val;
    }
    return Object.keys(headers).length ? headers : undefined;
  }
}

function parseExcludeMethods(value?: string | string[]): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

const META_TOOLS = [
  {
    name: 'parse_swagger',
    description: '解析 Swagger/OpenAPI 文档并动态注册为 MCP 工具',
  },
  {
    name: 'list_tools',
    description: '查询当前已注册的 MCP 工具列表（元工具 + 动态 API 工具）',
  },
] as const;

/** 注册元工具：parse_swagger、list_tools */
export function registerMetaTools(server: McpServer, registry: SwaggerToolRegistry): void {
  server.registerTool(
    'parse_swagger',
    {
      description:
        '解析 Swagger/OpenAPI 文档（URL、本地路径或 JSON/YAML 正文），并动态注册为可调用的 MCP 工具。',
      inputSchema: {
        swagger: z
          .string()
          .describe('Swagger/OpenAPI 文档：URL、本地路径或内联 JSON/YAML'),
        baseUrl: z.string().optional().describe('API 基础地址，不填则从文档自动推导'),
        apiHeaders: z
          .union([z.record(z.string(), z.string()), z.string()])
          .optional()
          .describe('调用 API 时的请求头'),
        toolNamePrefix: z.string().optional().describe('工具名前缀'),
        excludeMethods: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe('排除的 HTTP 方法，如 "options,head"'),
        excludePathPrefixes: z
          .array(z.string())
          .optional()
          .describe('排除的路径前缀'),
        replaceExisting: z
          .boolean()
          .optional()
          .default(true)
          .describe('是否先移除此前注册的工具，默认 true'),
      },
    },
    async ({
      swagger,
      baseUrl,
      apiHeaders,
      toolNamePrefix,
      excludeMethods,
      excludePathPrefixes,
      replaceExisting = true,
    }) => {
      try {
        if (replaceExisting) {
          registry.clearDynamicTools();
        }

        const spec = await parseSwaggerInput(swagger);
        const config: SwaggerMcpConfig = {
          baseUrl,
          apiHeaders: parseOptionalHeaders(apiHeaders),
          toolNamePrefix,
          excludeMethods: parseExcludeMethods(excludeMethods),
          excludePathPrefixes,
        };

        const result = registry.registerFromSpec(spec, config);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `已注册 ${result.toolCount} 个 API 工具`,
                  baseUrl: result.baseUrl,
                  toolCount: result.toolCount,
                  tools: result.toolNames,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'list_tools',
    {
      description: '查询当前 MCP 服务已注册的工具列表，包含元工具与 parse_swagger 动态注册的 API 工具',
      inputSchema: {},
    },
    async () => {
      const dynamicTools = registry.listDynamicTools();
      const baseUrl = registry.getLastBaseUrl();

      const result = {
        metaTools: META_TOOLS.map((t) => ({ ...t })),
        dynamicTools,
        dynamicCount: dynamicTools.length,
        totalCount: META_TOOLS.length + dynamicTools.length,
        baseUrl: baseUrl ?? null,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
