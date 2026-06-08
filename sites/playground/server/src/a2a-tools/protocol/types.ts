/** Playground 可识别的 A2A 协议主版本。 */
export type A2aProtocolVersion = '0.3' | '1.0';

/** Agent Card / Playground Agent 中用于推断协议版本的字段。 */
export type AgentProtocolSource = {
  api?: { url?: string; version?: string };
  supportedInterfaces?: AgentInterfaceLike[];
  supported_interfaces?: AgentInterfaceLike[];
  protocolVersion?: string;
  url?: string;
};

export type AgentInterfaceLike = {
  url?: string;
  protocolVersion?: string;
  protocol_version?: string;
};

/**
 * 单个 A2A 协议版本的适配器契约。
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
  buildSendMessageRequest(input: string): Record<string, unknown>;

  /**
   * 为当前协议版本补充规范要求的 HTTP 请求头。
   *
   * @param headers - 已有请求头（认证、Content-Type 等）
   * @returns 合并后的请求头
   */
  applyProtocolHeaders(headers: Record<string, string>): Record<string, string>;
}
