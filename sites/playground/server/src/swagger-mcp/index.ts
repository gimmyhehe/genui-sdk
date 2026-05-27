import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import {
  getSwaggerMcpServer,
  loadServerConfigFromEnv,
  registerSwaggerMcpHttpRoutes,
} from 'cloud-service-mcp-server';

function resolveSwaggerAssetsDir(): string {
  if (process.env.SWAGGER_MCP_ASSETS_DIR) {
    return resolve(process.env.SWAGGER_MCP_ASSETS_DIR);
  }

  const entryDir = dirname(fileURLToPath(import.meta.url));
  const distAssets = resolve(entryDir, 'assets');
  if (existsSync(distAssets)) {
    return distAssets;
  }

  try {
    const require = createRequire(import.meta.url);
    const pkgEntry = require.resolve('cloud-service-mcp-server');
    const pkgRoot = resolve(dirname(pkgEntry), '..');
    const pkgAssets = resolve(pkgRoot, 'assets');
    if (existsSync(pkgAssets)) {
      return pkgAssets;
    }
  } catch {
    // workspace 包未解析时回退
  }

  return distAssets;
}

/** 将 Swagger MCP 挂载到 playground server（默认开启，设 SWAGGER_MCP_ENABLED=false 可关闭） */
export function registerSwaggerMcp(app: Express): void {
  if (process.env.SWAGGER_MCP_ENABLED === 'false') {
    return;
  }

  const { mcpPath } = loadServerConfigFromEnv();
  const assetsDir = resolveSwaggerAssetsDir();
  const assetsBasePath = process.env.SWAGGER_MCP_ASSETS_PATH ?? '/api/swagger-assets';

  registerSwaggerMcpHttpRoutes(app, getSwaggerMcpServer, {
    mcpPath,
    assets: {
      assetsDir,
      basePath: assetsBasePath,
    },
  });

  console.info(`[swagger-mcp] MCP: ${mcpPath} | assets: ${assetsBasePath}`);
}
