export type ApiMcpServiceConfig = {
  name: string;
  openapi: string;
  /** @deprecated 兼容旧配置，请使用 openapi */
  swagger?: string;
  description?: string;
  baseUrl?: string;
  apiHeaders?: Record<string, string>;
  toolNamePrefix?: string;
  openapiFileName?: string;
  /** @deprecated 兼容旧配置，请使用 openapiFileName */
  swaggerFileName?: string;
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
