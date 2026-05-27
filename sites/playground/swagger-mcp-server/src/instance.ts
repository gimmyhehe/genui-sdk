import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SwaggerToolRegistry } from './server/swagger-tool-registry.js';
import { registerMetaTools } from './server/register-meta-tools.js';

type McpServerWithTools = McpServer & {
  _registeredTools: Record<string, RegisteredTool>;
};

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
    registerMetaTools(server, registry);
    swaggerMcpServer = server;
    swaggerToolRegistry = registry;
  }
  return swaggerMcpServer;
}

export function getSwaggerToolRegistry(): SwaggerToolRegistry {
  getSwaggerMcpServer();
  return swaggerToolRegistry!;
}

export type SwaggerMcpToolEntry = {
  name: string;
  registered: RegisteredTool;
};

/** 列出当前已注册且启用的 MCP 工具（含元工具与 parse_swagger 动态工具） */
export function listSwaggerMcpToolEntries(): SwaggerMcpToolEntry[] {
  const server = getSwaggerMcpServer() as McpServerWithTools;
  return Object.entries(server._registeredTools)
    .filter(([, registered]) => registered.enabled)
    .map(([name, registered]) => ({ name, registered }));
}
