import {
  OPENAPI_MCP_META_TOOL_NAMES,
  buildOpenApiAiSdkTools,
} from 'openapi-mcp-server';

export function buildApiMcpTools(): ReturnType<typeof buildOpenApiAiSdkTools> {
  const allTools = buildOpenApiAiSdkTools();
  const apiTools: ReturnType<typeof buildOpenApiAiSdkTools> = {};

  for (const [name, sdkTool] of Object.entries(allTools)) {
    if (OPENAPI_MCP_META_TOOL_NAMES.has(name)) {
      continue;
    }
    apiTools[name] = sdkTool;
  }

  return apiTools;
}
