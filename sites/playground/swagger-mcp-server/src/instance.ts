import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SwaggerToolRegistry } from './server/swagger-tool-registry.js';
import { registerMetaTools } from './server/register-meta-tools.js';
import type { SwaggerMcpToolCatalogEntry } from './server/mcp-tool-catalog.js';

let swaggerMcpServer: McpServer | null = null;
let swaggerToolRegistry: SwaggerToolRegistry | null = null;

/** 进程内共享的 Swagger MCP 实例（HTTP 与内置 AI 工具共用同一注册表） */
export function getSwaggerMcpServer(): McpServer {
  if (!swaggerMcpServer) {
    const server = new McpServer(
      {
        name: 'cloud-service-mcp-server',
        version: '1.0.0',
      },
      {
        instructions:
          '先调用 parse_swagger 传入 Swagger/OpenAPI 文档，将 API 注册为 MCP 工具；' +
          '可用 list_tools 查看当前已注册工具；再调用具体 API 工具执行 HTTP 请求。' +
          'path/query/header 按参数名传入，JSON 请求体使用 body 字段。',
      },
    );
    const registry = new SwaggerToolRegistry(server);
    registerMetaTools(registry);
    swaggerMcpServer = server;
    swaggerToolRegistry = registry;
  }
  return swaggerMcpServer;
}

export function getSwaggerToolRegistry(): SwaggerToolRegistry {
  getSwaggerMcpServer();
  return swaggerToolRegistry!;
}

export type { SwaggerMcpToolCatalogEntry as SwaggerMcpToolEntry };

/** 列出 catalog 中已注册且启用的工具（元工具 + 动态 API 工具） */
export function listSwaggerMcpToolEntries(): SwaggerMcpToolCatalogEntry[] {
  return getSwaggerToolRegistry().listRegisteredTools();
}
