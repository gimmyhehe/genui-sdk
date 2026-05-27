import { McpServer, type RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { DynamicToolInfo, SwaggerMcpConfig } from '../types.js';
import {
  extractOperations,
  executeApiOperation,
  loadApiRequestTimeoutMs,
  parametersToZodShape,
  requestBodyToZodField,
} from '../swagger/index.js';

export function registerSwaggerTools(
  server: McpServer,
  spec: OpenAPIV3.Document,
  config: SwaggerMcpConfig,
  baseUrl: string,
): {
  toolNames: string[];
  toolInfos: DynamicToolInfo[];
  registeredTools: Map<string, RegisteredTool>;
} {
  const operations = extractOperations(spec, config);
  const apiHeaders = config.apiHeaders ?? {};
  const requestTimeoutMs = config.requestTimeoutMs ?? loadApiRequestTimeoutMs();
  const toolNames: string[] = [];
  const toolInfos: DynamicToolInfo[] = [];
  const registeredTools = new Map<string, RegisteredTool>();

  for (const operation of operations) {
    const paramShape = parametersToZodShape(
      operation.parameters.map((p) => ({
        name: p.name,
        schema: p.schema,
        required: p.required,
        description: p.description,
      })),
    );

    const bodyShape = requestBodyToZodField(
      operation.requestBodySchema,
      Boolean(operation.requestBodyRequired),
    );

    const inputSchema = { ...paramShape, ...bodyShape };
    const description =
      operation.description ??
      `${operation.method} ${operation.path}`;

    const registered = server.registerTool(
      operation.toolName,
      {
        description: `[${operation.method} ${operation.path}] ${description}`,
        inputSchema,
      },
      async (args) => {
        try {
          const result = await executeApiOperation(
            operation,
            baseUrl,
            args,
            apiHeaders,
            requestTimeoutMs,
          );

          const text = JSON.stringify(
            {
              status: result.status,
              statusText: result.statusText,
              data: result.body,
            },
            null,
            2,
          );

          return {
            content: [{ type: 'text' as const, text }],
            isError: result.status >= 400,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text' as const, text: `API call failed: ${message}` }],
            isError: true,
          };
        }
      },
    );

    toolNames.push(operation.toolName);
    toolInfos.push({
      name: operation.toolName,
      method: operation.method,
      path: operation.path,
      description: `[${operation.method} ${operation.path}] ${description}`,
    });
    registeredTools.set(operation.toolName, registered);
  }

  return { toolNames, toolInfos, registeredTools };
}
