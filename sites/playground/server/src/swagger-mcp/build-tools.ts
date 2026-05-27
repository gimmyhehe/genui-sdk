import { buildSwaggerAiSdkTools } from 'cloud-service-mcp-server';

const SWAGGER_SYSTEM_PROMPT = `## Swagger / OpenAPI 工具（内置）

已内置 parse_swagger、list_tools。需要调用 HTTP API 时：
1. 用 parse_swagger 解析文档（URL、本地路径或内联 JSON/YAML；样例见 /api/swagger-assets）
2. 用 list_tools 查看已注册的 API 工具
3. 调用对应 API 工具执行请求`;

/** 与内置 Swagger MCP 同地址的外部配置（避免重复注册） */
export function isBuiltinSwaggerMcpUrl(url: string): boolean {
  if (process.env.SWAGGER_MCP_ENABLED === 'false') {
    return false;
  }

  try {
    const target = new URL(url);
    const port = String(process.env.PORT ?? 3008);
    const mcpPath = process.env.MCP_PATH ?? '/mcp';
    const normalizedPath = mcpPath.startsWith('/') ? mcpPath : `/${mcpPath}`;

    const isLocalHost =
      target.hostname === '127.0.0.1' ||
      target.hostname === 'localhost' ||
      target.hostname === '::1';
    const targetPort = target.port || (target.protocol === 'https:' ? '443' : '80');
    const portMatches = targetPort === port;

    return isLocalHost && portMatches && target.pathname.replace(/\/$/, '') === normalizedPath.replace(/\/$/, '');
  } catch {
    return false;
  }
}

/** 内置 Swagger 工具（默认启用，设 SWAGGER_MCP_ENABLED=false 关闭） */
export function buildBuiltinSwaggerTools(): Record<string, ReturnType<typeof buildSwaggerAiSdkTools>[string]> {
  if (process.env.SWAGGER_MCP_ENABLED === 'false') {
    return {};
  }
  return buildSwaggerAiSdkTools();
}

export function getBuiltinSwaggerSystemPrompt(): string {
  if (process.env.SWAGGER_MCP_ENABLED === 'false') {
    return '';
  }
  return SWAGGER_SYSTEM_PROMPT;
}
