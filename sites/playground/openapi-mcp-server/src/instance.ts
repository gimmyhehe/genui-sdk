import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OpenApiToolRegistry } from './server/openapi-tool-registry.js';
import { registerMetaTools } from './server/register-meta-tools.js';
import type { OpenApiMcpToolCatalogEntry } from './server/mcp-tool-catalog.js';

let openApiMcpServer: McpServer | null = null;
let openApiToolRegistry: OpenApiToolRegistry | null = null;

export function getOpenApiMcpServer(): McpServer {
  if (!openApiMcpServer) {
    const server = new McpServer(
      {
        name: 'openapi-mcp-server',
        version: '1.0.0',
      },
      {
        instructions:
          '先调用 parse_openapi 传入 OpenAPI 文档，将 API 注册为 MCP 工具；' +
          '可用 list_tools 查看当前已注册工具；再调用具体 API 工具执行 HTTP 请求。' +
          'path/query/header 按参数名传入，JSON 请求体使用 body 字段。',
      },
    );
    const registry = new OpenApiToolRegistry(server);
    registerMetaTools(registry);
    openApiMcpServer = server;
    openApiToolRegistry = registry;
  }
  return openApiMcpServer;
}

export function getOpenApiToolRegistry(): OpenApiToolRegistry {
  getOpenApiMcpServer();
  return openApiToolRegistry!;
}

export type { OpenApiMcpToolCatalogEntry as OpenApiMcpToolEntry };

export function listOpenApiMcpToolEntries(): OpenApiMcpToolCatalogEntry[] {
  return getOpenApiToolRegistry().listRegisteredTools();
}
