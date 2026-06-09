import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { ZodRawShape } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DynamicToolInfo, OpenApiMcpConfig } from '../types.js';
import { registerOpenApiTools } from './register-openapi-tools.js';
import { resolveBaseUrl } from '../openapi/parse-openapi-input.js';
import {
  OPENAPI_MCP_META_TOOL_NAMES,
  OpenApiMcpToolCatalog,
  type OpenApiMcpToolCatalogEntry,
} from './mcp-tool-catalog.js';

export type OpenApiRegisterResult = {
  toolCount: number;
  toolNames: string[];
  baseUrl: string;
};

export class OpenApiToolRegistry {
  private readonly catalog = new OpenApiMcpToolCatalog();
  private readonly dynamicToolInfos = new Map<string, DynamicToolInfo>();
  private lastBaseUrl?: string;

  constructor(private readonly server: McpServer) {}

  get toolCatalog(): OpenApiMcpToolCatalog {
    return this.catalog;
  }

  registerTool<InputArgs extends ZodRawShape>(
    name: string,
    config: { description?: string; inputSchema?: InputArgs },
    handler: ToolCallback<InputArgs>,
  ): RegisteredTool {
    return this.catalog.register(this.server, name, config, handler);
  }

  listRegisteredTools(): OpenApiMcpToolCatalogEntry[] {
    return this.catalog.listEnabled();
  }

  registerFromSpec(spec: OpenAPIV3.Document, config: OpenApiMcpConfig): OpenApiRegisterResult {
    const baseUrl = resolveBaseUrl(spec, config.baseUrl);
    const { toolNames, toolInfos } = registerOpenApiTools(
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
      .filter((entry) => OPENAPI_MCP_META_TOOL_NAMES.has(entry.name))
      .map((entry) => ({
        name: entry.name,
        description: entry.registered.description ?? entry.name,
      }));
  }
}
