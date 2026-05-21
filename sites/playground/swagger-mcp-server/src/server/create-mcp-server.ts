import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SwaggerToolRegistry } from './swagger-tool-registry.js';
import { registerMetaTools } from './register-meta-tools.js';

export function createSwaggerMcpServer(): McpServer {
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

  registerMetaTools(server, new SwaggerToolRegistry(server));
  return server;
}
