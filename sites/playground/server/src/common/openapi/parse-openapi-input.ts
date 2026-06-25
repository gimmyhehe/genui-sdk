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
    /^openapi\s*:/im.test(trimmed)
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

  if (serverUrl?.startsWith('/')) {
    throw new Error(`Relative server URL "${serverUrl}" requires baseUrl parameter`);
  }

  throw new Error('No base URL: provide baseUrl or define servers in the OpenAPI spec');
}
