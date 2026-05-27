import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { ZodRawShape } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DynamicToolInfo, SwaggerMcpConfig } from '../types.js';
import { registerSwaggerTools } from './register-swagger-tools.js';
import { resolveBaseUrl } from '../swagger/parse-swagger-input.js';
import {
  SWAGGER_MCP_META_TOOL_NAMES,
  SwaggerMcpToolCatalog,
  type SwaggerMcpToolCatalogEntry,
} from './mcp-tool-catalog.js';

export type SwaggerRegisterResult = {
  toolCount: number;
  toolNames: string[];
  baseUrl: string;
};

export class SwaggerToolRegistry {
  private readonly catalog = new SwaggerMcpToolCatalog();
  private readonly dynamicToolInfos = new Map<string, DynamicToolInfo>();
  private lastBaseUrl?: string;

  constructor(private readonly server: McpServer) {}

  get toolCatalog(): SwaggerMcpToolCatalog {
    return this.catalog;
  }

  registerTool<InputArgs extends ZodRawShape>(
    name: string,
    config: { description?: string; inputSchema?: InputArgs },
    handler: ToolCallback<InputArgs>,
  ): RegisteredTool {
    return this.catalog.register(this.server, name, config, handler);
  }

  listRegisteredTools(): SwaggerMcpToolCatalogEntry[] {
    return this.catalog.listEnabled();
  }

  registerFromSpec(spec: OpenAPIV3.Document, config: SwaggerMcpConfig): SwaggerRegisterResult {
    const baseUrl = resolveBaseUrl(spec, config.baseUrl);
    const { toolNames, toolInfos } = registerSwaggerTools(
      this.server,
      this.catalog,
      spec,
      config,
      baseUrl,
    );

    for (const info of toolInfos) {
      this.dynamicToolInfos.set(info.name, info);
    }

    for (const name of [...this.dynamicToolInfos.keys()]) {
      if (!toolNames.includes(name)) {
        this.dynamicToolInfos.delete(name);
      }
    }

    this.lastBaseUrl = baseUrl;
    this.server.sendToolListChanged();

    return {
      toolCount: toolNames.length,
      toolNames,
      baseUrl,
    };
  }

  clearDynamicTools(): number {
    const namesToRemove = [...this.dynamicToolInfos.keys()];
    for (const name of namesToRemove) {
      this.catalog.remove(name);
      this.dynamicToolInfos.delete(name);
    }
    this.lastBaseUrl = undefined;
    if (namesToRemove.length > 0) {
      this.server.sendToolListChanged();
    }
    return namesToRemove.length;
  }

  listDynamicTools(): DynamicToolInfo[] {
    return [...this.dynamicToolInfos.values()];
  }

  getLastBaseUrl(): string | undefined {
    return this.lastBaseUrl;
  }

  listMetaToolSummaries(): Array<{ name: string; description: string }> {
    return this.catalog
      .listEnabled()
      .filter((entry) => SWAGGER_MCP_META_TOOL_NAMES.has(entry.name))
      .map((entry) => ({
        name: entry.name,
        description: entry.registered.description ?? entry.name,
      }));
  }
}
