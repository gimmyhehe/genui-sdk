import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import yaml from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';

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

function isInlineSwaggerContent(source: string): boolean {
  const trimmed = source.trim();
  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('---') ||
    /^openapi\s*:/im.test(trimmed) ||
    /^swagger\s*:/im.test(trimmed)
  );
}

async function readSpecContent(source: string): Promise<string> {
  if (isInlineSwaggerContent(source)) {
    return source;
  }

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch swagger spec: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  const filePath = isAbsolute(source) ? source : resolve(process.cwd(), source);
  return readFile(filePath, 'utf-8');
}

/** 从 URL、本地路径或内联内容解析并校验 OpenAPI 文档 */
export async function parseSwaggerInput(swagger: string): Promise<OpenAPIV3.Document> {
  const content = await readSpecContent(swagger);
  const raw = parseRawSpec(content) as OpenAPIV3.Document;
  return (await SwaggerParser.validate(raw)) as unknown as OpenAPIV3.Document;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** 从 OpenAPI 3 servers 或 Swagger 2 host/basePath/schemes 解析 API 基础地址 */
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
