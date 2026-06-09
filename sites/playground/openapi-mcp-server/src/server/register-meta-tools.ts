import { z } from 'zod';
import type { OpenApiMcpConfig } from '../types.js';
import { parseOpenApiInput } from '../openapi/parse-openapi-input.js';
import type { OpenApiToolRegistry } from './openapi-tool-registry.js';

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

export function registerMetaTools(registry: OpenApiToolRegistry): void {
  registry.registerTool(
    'parse_openapi',
    {
      description:
        '解析 OpenAPI 文档（优先内联 JSON/YAML；URL/本地路径受服务端安全策略限制），并动态注册为可调用的 MCP 工具。',
      inputSchema: {
        openapi: z
          .string()
          .describe('OpenAPI 文档：内联 JSON/YAML，或管理员已放行的 URL / 本地路径'),
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
    async (args) => {
      const {
        openapi,
        baseUrl,
        apiHeaders,
        toolNamePrefix,
        excludeMethods,
        excludePathPrefixes,
        replaceExisting = true,
      } = args as {
        openapi?: string;
        swagger?: string;
        baseUrl?: string;
        apiHeaders?: Record<string, string> | string;
        toolNamePrefix?: string;
        excludeMethods?: string | string[];
        excludePathPrefixes?: string[];
        replaceExisting?: boolean;
      };
      const openApiDocument = openapi ?? (args as { swagger?: string }).swagger;
      try {
        if (replaceExisting) {
          registry.clearDynamicTools();
        }

        if (!openApiDocument?.trim()) {
          throw new Error('openapi is required');
        }

        const spec = await parseOpenApiInput(openApiDocument);
        const config: OpenApiMcpConfig = {
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

  registry.registerTool(
    'list_tools',
    {
      description: '查询当前 MCP 服务已注册的工具列表，包含元工具与 parse_openapi 动态注册的 API 工具',
      inputSchema: {},
    },
    async () => {
      const metaTools = registry.listMetaToolSummaries();
      const dynamicTools = registry.listDynamicTools();
      const baseUrl = registry.getLastBaseUrl();

      const result = {
        metaTools,
        dynamicTools,
        dynamicCount: dynamicTools.length,
        totalCount: metaTools.length + dynamicTools.length,
        baseUrl: baseUrl ?? null,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
