export type OpenApiInputMode = 'url' | 'inline' | 'file';

export interface OpenApiToolServiceFormData {
  name: string;
  openapi: string;
  openapiInputMode: OpenApiInputMode;
  openapiFileName?: string;
  index: number;
}

export type OpenApiPreviewTool = {
  name: string;
  summary?: string;
  method: string;
  path: string;
};

export type OpenApiPreviewData = {
  baseUrl: string;
  toolCount: number;
  toolNames: string[];
  tools?: OpenApiPreviewTool[];
};

export type OpenApiToolServiceConfig = {
  name: string;
  openapi: string;
  description?: string;
  baseUrl?: string;
  apiHeaders?: Record<string, string>;
  toolNamePrefix?: string;
  openapiFileName?: string;
  excludeMethods?: string[];
  excludePathPrefixes?: string[];
  toolCount?: number;
  toolNames?: string[];
  tools?: OpenApiPreviewTool[];
  enabled?: boolean;
};

const OPENAPI_FILE_EXTENSIONS = new Set(['.json', '.yaml', '.yml']);
const LARGE_FILE_WARNING_BYTES = 512 * 1024;

export function detectOpenApiInputMode(
  openapi: string,
  openapiFileName?: string,
): OpenApiInputMode {
  if (openapiFileName?.trim()) {
    return 'file';
  }
  const trimmed = (openapi || '').trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return 'url';
  }
  return trimmed ? 'inline' : 'url';
}

export function isSupportedOpenApiFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return [...OPENAPI_FILE_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

export function readOpenApiFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isSupportedOpenApiFile(file.name)) {
      reject(new Error('仅支持 .json、.yaml、.yml 格式的 OpenAPI 文件'));
      return;
    }

    if (file.size > LARGE_FILE_WARNING_BYTES) {
      console.warn(`OpenAPI 文件较大（${Math.round(file.size / 1024)}KB），可能影响 localStorage 存储`);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (!text.trim()) {
        reject(new Error('文件内容为空'));
        return;
      }
      resolve(text);
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file, 'UTF-8');
  });
}

export function formatOpenApiSourceLabel(service: {
  openapi?: string;
  openapiFileName?: string;
  description?: string;
}): string {
  if (service.description?.trim()) {
    return service.description.trim();
  }
  const fileName = service.openapiFileName?.trim();
  if (fileName) {
    return `文件：${fileName}`;
  }
  const openApiDocument = (service.openapi ?? '').trim();
  if (!openApiDocument) {
    return '';
  }
  if (/^https?:\/\//i.test(openApiDocument)) {
    return openApiDocument.length > 60 ? `${openApiDocument.slice(0, 60)}…` : openApiDocument;
  }
  return '内联文档';
}
