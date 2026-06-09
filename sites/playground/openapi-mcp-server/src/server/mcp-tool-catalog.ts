import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape } from 'zod';

export const OPENAPI_MCP_META_TOOL_NAMES = new Set(['parse_openapi', 'list_tools']);

export type OpenApiMcpToolCatalogEntry = {
  name: string;
  registered: RegisteredTool;
};

type ToolConfig<InputArgs extends ZodRawShape> = {
  description?: string;
  inputSchema?: InputArgs;
};

export class OpenApiMcpToolCatalog {
  private readonly tools = new Map<string, RegisteredTool>();

  register<InputArgs extends ZodRawShape>(
    server: McpServer,
    name: string,
    config: ToolConfig<InputArgs>,
    handler: ToolCallback<InputArgs>,
  ): RegisteredTool {
    this.tools.get(name)?.remove();
    const registered = server.registerTool(name, config, handler);
    this.tools.set(name, registered);
    return registered;
  }

  remove(name: string): void {
    this.tools.get(name)?.remove();
    this.tools.delete(name);
  }

  clearExcept(keepNames: ReadonlySet<string>): void {
    for (const name of [...this.tools.keys()]) {
      if (keepNames.has(name)) continue;
      this.remove(name);
    }
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  listEnabled(): OpenApiMcpToolCatalogEntry[] {
    return [...this.tools.entries()]
      .filter(([, registered]) => registered.enabled)
      .map(([name, registered]) => ({ name, registered }));
  }
}
