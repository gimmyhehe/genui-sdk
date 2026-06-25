export type OpenApiInputMode = 'url' | 'inline' | 'file';

export interface ApiMcpFormData {
  name: string;
  openapi: string;
  openapiInputMode: OpenApiInputMode;
  openapiFileName?: string;
  index: number;
}

export interface ApiMcpPreviewTool {
  name: string;
  summary?: string;
  method: string;
  path: string;
}

export interface ApiMcpPreviewData {
  baseUrl: string;
  toolCount: number;
  toolNames: string[];
  tools?: ApiMcpPreviewTool[];
}
