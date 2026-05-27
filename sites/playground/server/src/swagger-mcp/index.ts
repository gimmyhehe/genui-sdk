import type { Express } from 'express';
import {
  getSwaggerMcpServer,
  loadServerConfigFromEnv,
  registerSwaggerMcpHttpRoutes,
} from 'cloud-service-mcp-server';

export function registerSwaggerMcp(app: Express): void {
  if (process.env.SWAGGER_MCP_ENABLED === 'false') {
    return;
  }

  const { mcpPath } = loadServerConfigFromEnv();

  registerSwaggerMcpHttpRoutes(app, getSwaggerMcpServer, { mcpPath });

  console.info(`[swagger-mcp] MCP: ${mcpPath}`);
}
