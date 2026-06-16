/** Playground Agent 配置（前端字段 + Agent Card 透传字段）。 */
export type PlaygroundAgentConfig = {
  // 前端字段（从 metadata.playground.agents 获取）
  name: string;
  agentCardUrl: string;
  description?: string;
  enabled?: boolean;

  // Agent Card 解析后在服务端扩展的字段（可选）
  version?: string;
  api?: {
    type?: string;
    url?: string;
    version?: string;
  };
  auth?: {
    type?: string;
    instructions?: string;
  };
  authentication?: { schemes?: string[] };
  securitySchemes?: Record<string, { httpAuthSecurityScheme?: { scheme?: string } }>;
  capabilities?: string[];
};
