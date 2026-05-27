export type McpServerConfig = {
  name: string;
  url: string;
  description?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
};

export type McpServer = {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  enabled?: boolean;
};

export type McpServersConfig = McpServerConfig[];

/** 未设置 enabled 时视为启用（与 Playground UI 新建 MCP 默认 enabled: true 一致） */
export function isMcpServerEnabled(server: Pick<McpServerConfig, 'enabled'>): boolean {
  return server.enabled !== false;
}
