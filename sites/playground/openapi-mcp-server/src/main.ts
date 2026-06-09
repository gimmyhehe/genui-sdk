import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadServerConfigFromEnv } from './config.js';
import { createOpenApiMcpServer, createMcpHttpApp } from './server/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

async function main() {
  const { port, mcpTransport, mcpPath } = loadServerConfigFromEnv();

  if (mcpTransport === 'stdio') {
    const server = createOpenApiMcpServer();
    await server.connect(new StdioServerTransport());
    console.error('[openapi-mcp-server] stdio mode started');
    return;
  }

  const { app } = createMcpHttpApp(createOpenApiMcpServer, mcpPath);

  app.listen(port, () => {
    console.log(`[openapi-mcp-server] http://localhost:${port}${mcpPath}`);
    console.log(`[openapi-mcp-server] 请先调用 parse_openapi 注册 API 工具`);
  });
}

main().catch((error) => {
  console.error('[openapi-mcp-server] Failed to start:', error);
  process.exit(1);
});
