import {
  getOpenApiToolRegistry,
  parseOpenApiInput,
  type OpenApiMcpConfig,
} from 'openapi-mcp-server';
import type { ApiMcpServiceConfig } from './types.js';

function slugifyName(name: string): string {
  const slug = name
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return /^[0-9]/.test(slug) ? `_${slug}` : slug;
}

export async function registerApiMcpServices(services: ApiMcpServiceConfig[] | undefined): Promise<void> {
  const enabled = (services ?? []).filter(
    (s) => s.enabled !== false && (s.openapi ?? s.swagger)?.trim(),
  );
  const registry = getOpenApiToolRegistry();
  registry.clearDynamicTools();

  if (!enabled.length) {
    return;
  }

  for (const service of enabled) {
    const openApiDocument = (service.openapi ?? service.swagger ?? '').trim();
    const spec = await parseOpenApiInput(openApiDocument);
    const config: OpenApiMcpConfig = {
      baseUrl: service.baseUrl,
      apiHeaders: service.apiHeaders,
      toolNamePrefix: service.toolNamePrefix?.trim() || slugifyName(service.name),
      excludeMethods: service.excludeMethods,
      excludePathPrefixes: service.excludePathPrefixes,
    };
    registry.registerFromSpec(spec, config);
  }
}
