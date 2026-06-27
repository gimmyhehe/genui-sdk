export type OpenApiInputMode = 'url' | 'inline' | 'file';

export interface OpenApiMcpToolFormData {
  name: string;
  openapi: string;
  openapiInputMode: OpenApiInputMode;
  openapiFileName?: string;
  index: number;
}
