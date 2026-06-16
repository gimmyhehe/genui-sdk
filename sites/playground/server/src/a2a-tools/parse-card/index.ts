/**
 * Agent Card 解析：从 Card JSON 提取调用端点（url / 协议版本 / binding）。
 *
 * - `fetch-card`：HTTP 代理拉取原始 JSON
 * - `parse-card`（本模块）：解析并规范化，供 invoke / chat-genui 共用
 */
export {
  AgentCardProtocolError,
  normalizeAgentCard,
  resolveAgentApiUrl,
  resolveAgentInterface,
} from './parse.js';
export type { ResolvedAgentInterface } from './parse.js';
export type { A2aProtocolVersion } from './types.js';
