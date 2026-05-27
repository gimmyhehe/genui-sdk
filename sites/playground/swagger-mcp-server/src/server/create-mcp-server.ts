import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSwaggerMcpServer } from '../instance.js';

/** @deprecated Use getSwaggerMcpServer() instead. */
export function createSwaggerMcpServer(): McpServer {
  return getSwaggerMcpServer();
}
