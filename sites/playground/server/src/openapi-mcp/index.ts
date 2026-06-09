import type { Express } from 'express';
import {
  getOpenApiMcpServer,
  loadServerConfigFromEnv,
  registerOpenApiMcpHttpRoutes,
} from 'openapi-mcp-server';

export function registerOpenApiMcp(app: Express): void {
  if (process.env.OPENAPI_MCP_ENABLED === 'false' || process.env.SWAGGER_MCP_ENABLED === 'false') {
    return;
  }

  const { mcpPath } = loadServerConfigFromEnv();

  registerOpenApiMcpHttpRoutes(app, getOpenApiMcpServer, { mcpPath });

  console.info(`[openapi-mcp] MCP: ${mcpPath}`);
}
