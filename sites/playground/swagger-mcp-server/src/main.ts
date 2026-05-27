import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadServerConfigFromEnv } from './config.js';
import { createSwaggerMcpServer, createMcpHttpApp } from './server/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

async function main() {
  const { port, mcpTransport, mcpPath } = loadServerConfigFromEnv();

  if (mcpTransport === 'stdio') {
    const server = createSwaggerMcpServer();
    await server.connect(new StdioServerTransport());
    console.error('[cloud-service-mcp] stdio mode started');
    return;
  }

  const { app } = createMcpHttpApp(createSwaggerMcpServer, mcpPath);

  app.listen(port, () => {
    console.log(`[cloud-service-mcp] http://localhost:${port}${mcpPath}`);
    console.log(`[cloud-service-mcp] 请先调用 parse_swagger 注册 API 工具`);
  });
}

main().catch((error) => {
  console.error('[cloud-service-mcp] Failed to start:', error);
  process.exit(1);
});
