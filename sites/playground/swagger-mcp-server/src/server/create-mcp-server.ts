import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSwaggerMcpServer } from '../instance.js';

/** @deprecated 使用 getSwaggerMcpServer()；保留别名以兼容独立启动 */
export function createSwaggerMcpServer(): McpServer {
  return getSwaggerMcpServer();
}
