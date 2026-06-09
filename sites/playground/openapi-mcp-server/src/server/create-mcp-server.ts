import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getOpenApiMcpServer } from '../instance.js';

/** @deprecated Use getOpenApiMcpServer() instead. */
export function createOpenApiMcpServer(): McpServer {
  return getOpenApiMcpServer();
}
