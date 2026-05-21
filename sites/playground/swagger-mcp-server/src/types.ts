import type { OpenAPIV3 } from 'openapi-types';

export type SwaggerMcpConfig = {
  /** API 基础地址，不填则从 spec.servers 取第一个 */
  baseUrl?: string;
  /** 调用 API 时附加的请求头 */
  apiHeaders?: Record<string, string>;
  /** 需要排除的 HTTP 方法 */
  excludeMethods?: string[];
  /** 需要排除的路径前缀 */
  excludePathPrefixes?: string[];
  /** 工具名前缀 */
  toolNamePrefix?: string;
};

export type ApiParameter = {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: OpenAPIV3.SchemaObject;
};

export type ApiOperation = {
  toolName: string;
  method: string;
  path: string;
  description?: string;
  parameters: ApiParameter[];
  requestBodySchema?: OpenAPIV3.SchemaObject;
  requestBodyRequired?: boolean;
  requestBodyContentType?: string;
};

export type ToolCallArgs = Record<string, unknown>;

/** parse_swagger 动态注册的 API 工具信息 */
export type DynamicToolInfo = {
  name: string;
  method: string;
  path: string;
  description: string;
};
