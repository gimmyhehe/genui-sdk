/** Playground 可识别的 A2A 协议 binding（传输层）。 */
export type A2aProtocolBinding = 'JSONRPC' | 'HTTP+JSON';

/** Playground 可识别的 A2A 协议主版本。 */
export type A2aProtocolVersion = '0.3' | '1.0';

/** Playground Client 支持的 A2A 协议组合。 */
export const A2A_PROTOCOL_CONFIG = {
  supportedVersions: ['1.0', '0.3'] as A2aProtocolVersion[],
  supportedBindings: ['JSONRPC', 'HTTP+JSON'] as A2aProtocolBinding[],
} as const;

/** Agent Card / Playground Agent 中用于推断协议版本的字段。 */
export type AgentProtocolSource = {
  api?: { url?: string; type?: string; version?: string };
  supportedInterfaces?: AgentInterfaceLike[];
  supported_interfaces?: AgentInterfaceLike[];
  protocolVersion?: string;
  /** A2A 0.3 Agent Card 顶层 url。 */
  url?: string;
  /** A2A 0.3 Agent Card 传输声明。 */
  preferredTransport?: string;
};

export type AgentInterfaceLike = {
  url?: string;
  protocolBinding?: string;
  protocol_binding?: string;
  protocolVersion?: string;
  protocol_version?: string;
};
