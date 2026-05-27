import { readFile, realpath } from 'node:fs/promises';
import { isIP } from 'node:net';
import { isAbsolute, relative, resolve } from 'node:path';
import { loadApiRequestTimeoutMs } from './http-executor.js';

export type SwaggerInputPolicy = {
  allowInline: boolean;
  allowUrlFetch: boolean;
  allowFileRead: boolean;
  /** 允许 fetch http(s)://127.0.0.1 / localhost（仅建议在受信环境开启） */
  allowLocalhostUrl: boolean;
  /** 文件读取根目录（已 resolve）；为空则禁止读文件 */
  allowedFileRoots: string[];
  /** 若非空，仅允许这些 hostname（小写，不含端口） */
  urlHostnameAllowlist: string[] | null;
  fetchTimeoutMs: number;
  maxRedirects: number;
};

function parseBoolEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return raw === '1' || raw.toLowerCase() === 'true';
}

function parsePathListEnv(name: string): string[] {
  const raw = process.env[name];
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => resolve(p));
}

/** 默认：仅内联；URL/本地文件需显式开启（防 SSRF / 任意文件读） */
export function loadSwaggerInputPolicyFromEnv(): SwaggerInputPolicy {
  const allowedFileRoots = parsePathListEnv('MCP_SWAGGER_ALLOWED_FILE_DIRS');

  return {
    allowInline: parseBoolEnv('MCP_SWAGGER_ALLOW_INLINE', true),
    allowUrlFetch: parseBoolEnv('MCP_SWAGGER_ALLOW_URL_FETCH', false),
    allowFileRead: parseBoolEnv('MCP_SWAGGER_ALLOW_FILE_READ', false),
    allowLocalhostUrl: parseBoolEnv('MCP_SWAGGER_ALLOW_LOCALHOST_URL', false),
    allowedFileRoots,
    urlHostnameAllowlist: parseHostnameAllowlistEnv(),
    fetchTimeoutMs: loadApiRequestTimeoutMs(),
    maxRedirects: 3,
  };
}

function parseHostnameAllowlistEnv(): string[] | null {
  const raw = process.env.MCP_SWAGGER_URL_HOST_ALLOWLIST;
  if (!raw?.trim()) return null;
  const hosts = raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length ? hosts : null;
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  return false;
}

function isBlockedHostname(hostname: string, policy: SwaggerInputPolicy): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');

  if (policy.urlHostnameAllowlist) {
    return !policy.urlHostnameAllowlist.includes(host);
  }

  if (host === 'localhost' || host.endsWith('.localhost')) {
    return !policy.allowLocalhostUrl;
  }

  if (host.endsWith('.internal') || host === 'metadata.google.internal') {
    return true;
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4) return isPrivateIpv4(host);
  if (ipVersion === 6) return isPrivateIpv6(host);

  return false;
}

export function validateSwaggerFetchUrl(urlString: string, policy: SwaggerInputPolicy): URL {
  if (!policy.allowUrlFetch) {
    throw new Error(
      'Remote URL fetch is disabled. Pass inline OpenAPI JSON/YAML, or set MCP_SWAGGER_ALLOW_URL_FETCH=true with appropriate host restrictions.',
    );
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('Invalid swagger URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed for swagger fetch');
  }

  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed');
  }

  if (isBlockedHostname(url.hostname, policy)) {
    throw new Error('Swagger URL host is not allowed');
  }

  return url;
}

async function fetchWithRedirectGuard(
  initialUrl: URL,
  policy: SwaggerInputPolicy,
): Promise<string> {
  let current = initialUrl;

  for (let hop = 0; hop <= policy.maxRedirects; hop += 1) {
    validateSwaggerFetchUrl(current.toString(), policy);

    const signal = AbortSignal.timeout(policy.fetchTimeoutMs);
    const response = await fetch(current.toString(), {
      signal,
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect response missing Location header (${response.status})`);
      }
      if (hop >= policy.maxRedirects) {
        throw new Error('Too many redirects while fetching swagger spec');
      }
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch swagger spec: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  throw new Error('Too many redirects while fetching swagger spec');
}

export async function fetchSwaggerSpecUrl(urlString: string, policy: SwaggerInputPolicy): Promise<string> {
  const url = validateSwaggerFetchUrl(urlString, policy);
  return fetchWithRedirectGuard(url, policy);
}

async function resolveAllowedFilePath(source: string, policy: SwaggerInputPolicy): Promise<string> {
  if (!policy.allowFileRead) {
    throw new Error(
      'Local file paths are disabled. Pass inline OpenAPI JSON/YAML, or set MCP_SWAGGER_ALLOW_FILE_READ=true and MCP_SWAGGER_ALLOWED_FILE_DIRS.',
    );
  }

  if (policy.allowedFileRoots.length === 0) {
    throw new Error('File read is enabled but MCP_SWAGGER_ALLOWED_FILE_DIRS is not configured');
  }

  const candidate = isAbsolute(source) ? source : resolve(process.cwd(), source);
  const realFile = await realpath(candidate);

  for (const root of policy.allowedFileRoots) {
    const realRoot = await realpath(root);
    const rel = relative(realRoot, realFile);
    if (!rel.startsWith('..') && !isAbsolute(rel)) {
      return realFile;
    }
  }

  throw new Error('Swagger file path is outside allowed directories');
}

export async function readSwaggerSpecFile(source: string, policy: SwaggerInputPolicy): Promise<string> {
  const filePath = await resolveAllowedFilePath(source, policy);
  return readFile(filePath, 'utf-8');
}

export function assertInlineSwaggerAllowed(policy: SwaggerInputPolicy): void {
  if (!policy.allowInline) {
    throw new Error('Inline swagger content is disabled by server policy');
  }
}
