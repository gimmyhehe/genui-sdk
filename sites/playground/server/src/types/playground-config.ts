import type { PlaygroundAgentConfig } from '../a2a-tools/index.js';
import type { McpServersConfig } from './mcp-server.js';
import type { PlaygroundSkillConfig } from '../skills/index.js';
import type { VariantKey } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';

export interface IPlaygroundConfig {
  mcpServers: McpServersConfig;
  framework: string;
  promptList: string[];
  model: string;
  temperature: number;
  agents?: PlaygroundAgentConfig[];
  skills?: PlaygroundSkillConfig[];
  promptVariant?: VariantKey;
}
