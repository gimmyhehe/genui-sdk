import type { OpenApiInputMode } from './common.types';
import { t } from '../i18n';

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
      reject(new Error(t('openApi.unsupportedFileFormat')));
      return;
    }

    if (file.size > LARGE_FILE_WARNING_BYTES) {
      console.warn(t('openApi.largeFileWarning', { size: Math.round(file.size / 1024) }));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (!text.trim()) {
        reject(new Error(t('openApi.emptyFile')));
        return;
      }
      resolve(text);
    };
    reader.onerror = () => reject(new Error(t('openApi.readFileFailed')));
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
    return t('openApi.sourceFileLabel', { fileName });
  }
  const openApiDocument = (service.openapi ?? '').trim();
  if (!openApiDocument) {
    return '';
  }
  if (/^https?:\/\//i.test(openApiDocument)) {
    return openApiDocument.length > 60 ? `${openApiDocument.slice(0, 60)}…` : openApiDocument;
  }
  return t('openApi.inlineDocument');
}
