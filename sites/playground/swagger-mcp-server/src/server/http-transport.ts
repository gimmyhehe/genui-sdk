import { randomUUID } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerAssetsApi, type RegisterAssetsApiOptions } from './assets-api.js';

type TransportMap = Record<string, StreamableHTTPServerTransport>;

export type RegisterSwaggerMcpHttpRoutesOptions = {
  mcpPath?: string;
  assets?: RegisterAssetsApiOptions;
  /** 独立运行时注册 /health；集成到已有服务时建议 false */
  registerHealth?: boolean;
};

/** 将 Swagger MCP HTTP 路由挂载到已有 Express 应用（仅 MCP 路由使用 JSON 解析，不影响其他接口） */
export function registerSwaggerMcpHttpRoutes(
  app: Express,
  getServer: () => McpServer,
  options: RegisterSwaggerMcpHttpRoutesOptions = {},
) {
  const { mcpPath = '/mcp', assets, registerHealth = false } = options;
  const jsonMiddleware = express.json();
  const transports: TransportMap = {};

  const mcpPostHandler = async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports[id] = transport!;
          },
        });

        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
          }
        };

        await getServer().connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  const mcpGetHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  };

  const mcpDeleteHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  };

  app.post(mcpPath, jsonMiddleware, mcpPostHandler);
  app.get(mcpPath, mcpGetHandler);
  app.delete(mcpPath, mcpDeleteHandler);

  if (registerHealth) {
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });
  }

  registerAssetsApi(app, assets);
}

export function createMcpHttpApp(
  getServer: () => McpServer,
  mcpPath = '/mcp',
  assets?: RegisterAssetsApiOptions,
) {
  const app = express();
  registerSwaggerMcpHttpRoutes(app, getServer, {
    mcpPath,
    assets,
    registerHealth: true,
  });
  return { app };
}
