import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { DynamicToolInfo, OpenApiMcpConfig } from '../types.js';
import { listOpenApiOperationToolDefinitions } from '../openapi/operation-tool-definitions.js';
import type { OpenApiMcpToolCatalog } from './mcp-tool-catalog.js';

export function registerOpenApiTools(
  server: McpServer,
  catalog: OpenApiMcpToolCatalog,
  spec: OpenAPIV3.Document,
  config: OpenApiMcpConfig,
  baseUrl: string,
): {
  toolNames: string[];
  toolInfos: DynamicToolInfo[];
} {
  const definitions = listOpenApiOperationToolDefinitions(spec, config, baseUrl);
  const toolNames: string[] = [];
  const toolInfos: DynamicToolInfo[] = [];

  for (const definition of definitions) {
    catalog.register(
      server,
      definition.toolName,
      {
        description: definition.description,
        inputSchema: definition.inputSchema,
      },
      definition.execute,
    );

    toolNames.push(definition.toolName);
    toolInfos.push(definition.toolInfo);
  }

  return { toolNames, toolInfos };
}
