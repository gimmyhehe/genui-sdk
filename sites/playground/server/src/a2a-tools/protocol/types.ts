/** Playground 可识别的 A2A 协议 binding（传输层）。 */
export type A2aProtocolBinding = 'JSONRPC' | 'HTTP+JSON';

/** Playground 可识别的 A2A 协议主版本。 */
export type A2aProtocolVersion = '0.3' | '1.0';

/** Agent Card / Playground Agent 中用于推断协议版本的字段。 */
export type AgentProtocolSource = {
  api?: { url?: string; type?: string; version?: string };
  supportedInterfaces?: AgentInterfaceLike[];
  supported_interfaces?: AgentInterfaceLike[];
  protocolVersion?: string;
  url?: string;
};

export type AgentInterfaceLike = {
  url?: string;
  protocolBinding?: string;
  protocol_binding?: string;
  protocolVersion?: string;
  protocol_version?: string;
};

/**
 * 单个 A2A 协议版本的适配器契约（消息格式，与 binding 解耦）。
 * 新增版本时实现此接口并注册；弃用旧版本时删除对应适配器文件即可。
 */
export interface A2aProtocolAdapter {
  /** 协议主版本标识，如 `'0.3'`、`'1.0'`。 */
  readonly version: A2aProtocolVersion;

  /**
   * 构造 JSON-RPC SendMessage 请求体。
   *
   * @param input - 用户自然语言输入
   * @returns JSON-RPC 2.0 请求对象
   */
  buildJsonRpcSendMessageRequest(input: string): Record<string, unknown>;

  /**
   * 构造 HTTP+JSON binding 的 SendMessage 请求体（REST，无 jsonrpc 包装）。
   *
   * @param input - 用户自然语言输入
   * @returns SendMessageRequest 等价 JSON
   */
  buildHttpJsonSendMessageBody(input: string): Record<string, unknown>;

  /**
   * 解析 HTTP+JSON SendMessage 的路径段（相对 api.url）。
   *
   * @param baseUrl - Agent Card 中的接口基址
   * @returns 如 `message:send` 或 `v1/message:send`
   */
  resolveHttpSendMessagePath(baseUrl: string): string;

  /**
   * 为当前协议版本补充规范要求的 HTTP 请求头。
   *
   * @param headers - 已有请求头（认证、Content-Type 等）
   * @returns 合并后的请求头
   */
  applyProtocolHeaders(headers: Record<string, string>): Record<string, string>;
}
