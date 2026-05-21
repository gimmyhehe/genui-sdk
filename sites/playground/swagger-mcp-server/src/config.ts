export type ServerConfig = {
  port: number;
  mcpTransport: 'http' | 'stdio';
  mcpPath: string;
};

export function loadServerConfigFromEnv(): ServerConfig {
  const transport = (process.env.MCP_TRANSPORT ?? 'http').toLowerCase();

  return {
    port: Number(process.env.PORT ?? 3100),
    mcpTransport: transport === 'stdio' ? 'stdio' : 'http',
    mcpPath: process.env.MCP_PATH ?? '/mcp',
  };
}
