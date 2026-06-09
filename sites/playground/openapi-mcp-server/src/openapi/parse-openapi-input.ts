import SwaggerParser from '@apidevtools/swagger-parser';
import yaml from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';
import {
  assertInlineOpenApiAllowed,
  fetchOpenApiSpecUrl,
  loadOpenApiInputPolicyFromEnv,
  readOpenApiSpecFile,
  type OpenApiInputPolicy,
} from './openapi-input-security.js';

type Swagger2HostFields = {
  host?: string;
  basePath?: string;
  schemes?: string[];
};

function parseRawSpec(content: string): unknown {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  return yaml.load(trimmed);
}

function isInlineOpenApiContent(source: string): boolean {
  const trimmed = source.trim();
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('---') ||
    /^openapi\s*:/im.test(trimmed) ||
    /^swagger\s*:/im.test(trimmed)
  );
}

async function readSpecContent(
  source: string,
  policy: OpenApiInputPolicy = loadOpenApiInputPolicyFromEnv(),
): Promise<string> {
  if (isInlineOpenApiContent(source)) {
    assertInlineOpenApiAllowed(policy);
    return source;
  }

  const trimmed = source.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return fetchOpenApiSpecUrl(trimmed, policy);
  }

  return readOpenApiSpecFile(trimmed, policy);
}

export async function parseOpenApiInput(
  openapi: string,
  policy?: OpenApiInputPolicy,
): Promise<OpenAPIV3.Document> {
  const content = await readSpecContent(openapi, policy);
  const raw = parseRawSpec(content) as OpenAPIV3.Document;
  return (await SwaggerParser.validate(raw, { resolve: { external: false } })) as unknown as OpenAPIV3.Document;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export function resolveBaseUrl(spec: OpenAPIV3.Document, override?: string): string {
  if (override) {
    return normalizeBaseUrl(override);
  }

  const serverUrl = spec.servers?.[0]?.url;
  if (serverUrl && !serverUrl.startsWith('/')) {
    return normalizeBaseUrl(serverUrl);
  }

  const swagger2 = spec as OpenAPIV3.Document & Swagger2HostFields;
  if (swagger2.host) {
    const scheme = swagger2.schemes?.[0] ?? 'https';
    const basePath = (swagger2.basePath ?? '').replace(/\/$/, '');
    return normalizeBaseUrl(`${scheme}://${swagger2.host}${basePath}`);
  }

  if (serverUrl?.startsWith('/')) {
    throw new Error(`Relative server URL "${serverUrl}" requires baseUrl parameter`);
  }

  throw new Error('No base URL: provide baseUrl or define servers/host in the OpenAPI spec');
}
