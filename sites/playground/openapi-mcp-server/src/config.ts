export type ServerConfig = {
  port: number;
  mcpTransport: 'http' | 'stdio';
  mcpPath: string;
};

export function loadServerConfigFromEnv(): ServerConfig {
  const transport = (process.env.MCP_TRANSPORT ?? 'http').toLowerCase();
  const parsedPort = Number.parseInt(process.env.PORT ?? '3100', 10);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3100;

  return {
    port,
    mcpTransport: transport === 'stdio' ? 'stdio' : 'http',
    mcpPath: process.env.MCP_PATH ?? '/mcp',
  };
}
