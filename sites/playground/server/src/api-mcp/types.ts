export type ApiMcpServiceConfig = {
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
  tools?: ApiMcpPreviewTool[];
  enabled?: boolean;
};

export type ApiMcpPreviewTool = {
  name: string;
  summary?: string;
  method: string;
  path: string;
};

export type ApiMcpPreviewResult = {
  baseUrl: string;
  toolCount: number;
  toolNames: string[];
  tools: ApiMcpPreviewTool[];
};
