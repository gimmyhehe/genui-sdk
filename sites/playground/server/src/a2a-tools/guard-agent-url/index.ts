/**
 * Agent 出站 URL 防护：生产环境拦截本地/内网地址（SSRF），开发环境放行。
 *
 * 用于 `fetch-card` 拉取 Card、`invoke-agent` 调用 Agent、`chat-genui` 过滤 Agent 列表。
 */
export { isAllowedAgentUrl, isPlaygroundDevelopment } from './guard.js';
