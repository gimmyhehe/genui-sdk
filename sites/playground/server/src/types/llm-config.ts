import type { McpServersConfig } from './mcp-server.js';
import type { PlaygroundSkillConfig } from '../skills/index.js';

export type LLMConfigParams = {
  model?: string;
  temperature?: number;
  prompt?: string;
  mcpServers?: McpServersConfig;
  skills?: PlaygroundSkillConfig[];
};

export type LLMConfig = LLMConfigParams & {
  supportJsonFormat?: boolean;
  specificPrompt?: string;
};
