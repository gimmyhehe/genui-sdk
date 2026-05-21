import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { DynamicToolInfo, SwaggerMcpConfig } from '../types.js';
import { registerSwaggerTools } from './register-swagger-tools.js';
import { resolveBaseUrl } from '../swagger/parse-swagger-input.js';

export type SwaggerRegisterResult = {
  toolCount: number;
  toolNames: string[];
  baseUrl: string;
};

export class SwaggerToolRegistry {
  private readonly dynamicTools = new Map<string, RegisteredTool>();
  private readonly dynamicToolInfos = new Map<string, DynamicToolInfo>();
  private lastBaseUrl?: string;

  constructor(private readonly server: McpServer) {}

  registerFromSpec(spec: OpenAPIV3.Document, config: SwaggerMcpConfig): SwaggerRegisterResult {
    const baseUrl = resolveBaseUrl(spec, config.baseUrl);
    const { toolNames, toolInfos, registeredTools } = registerSwaggerTools(
      this.server,
      spec,
      config,
      baseUrl,
    );

    for (const [name, tool] of registeredTools) {
      this.dynamicTools.get(name)?.remove();
      this.dynamicTools.set(name, tool);
    }

    for (const info of toolInfos) {
      this.dynamicToolInfos.set(info.name, info);
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
    const count = this.dynamicTools.size;
    for (const tool of this.dynamicTools.values()) {
      tool.remove();
    }
    this.dynamicTools.clear();
    this.dynamicToolInfos.clear();
    this.lastBaseUrl = undefined;
    if (count > 0) {
      this.server.sendToolListChanged();
    }
    return count;
  }

  listDynamicTools(): DynamicToolInfo[] {
    return [...this.dynamicToolInfos.values()];
  }

  getLastBaseUrl(): string | undefined {
    return this.lastBaseUrl;
  }
}
