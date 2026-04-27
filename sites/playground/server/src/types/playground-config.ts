import type { PlaygroundAgentConfig } from '../a2a-tools/index.js';
import type { McpServersConfig } from '../chat-genui.js';

export interface IPlaygroundConfig {
  mcpServers: McpServersConfig;
  framework: string;
  promptList: string[];
  model: string;
  temperature: number;
  agents: PlaygroundAgentConfig[];
};
