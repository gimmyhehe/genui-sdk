import {
  extractOperations,
  parseOpenApiInput,
  resolveBaseUrl,
  type OpenApiMcpConfig,
} from 'openapi-mcp-server';
import type { ApiMcpPreviewResult } from './types.js';

export type PreviewOpenApiInput = {
  openapi: string;
  baseUrl?: string;
  apiHeaders?: Record<string, string>;
  toolNamePrefix?: string;
  excludeMethods?: string[];
  excludePathPrefixes?: string[];
};

export async function previewOpenApiMcpRegistration(
  input: PreviewOpenApiInput,
): Promise<ApiMcpPreviewResult> {
  const spec = await parseOpenApiInput(input.openapi);
  const config: OpenApiMcpConfig = {
    baseUrl: input.baseUrl,
    apiHeaders: input.apiHeaders,
    toolNamePrefix: input.toolNamePrefix,
    excludeMethods: input.excludeMethods,
    excludePathPrefixes: input.excludePathPrefixes,
  };
  const baseUrl = resolveBaseUrl(spec, config.baseUrl);
  const operations = extractOperations(spec, config);

  const tools = operations.map((op) => ({
    name: op.toolName,
    summary: op.summary,
    method: op.method,
    path: op.path,
  }));

  return {
    baseUrl,
    toolCount: operations.length,
    toolNames: tools.map((tool) => tool.name),
    tools,
  };
}
