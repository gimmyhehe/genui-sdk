/** JSON-RPC 标准错误码：Method not found。 */
export const JSONRPC_METHOD_NOT_FOUND = -32601;

/**
 * 判断 JSON-RPC 错误是否可能由协议版本/方法名不匹配引起，从而值得尝试另一已启用版本。
 *
 * @param rpcError - JSON-RPC error 对象
 * @returns 是否建议 fallback
 */
export function isRetryableProtocolRpcError(
  rpcError: { code?: number; message?: string } | undefined,
): boolean {
  if (!rpcError) {
    return false;
  }

  if (rpcError.code === JSONRPC_METHOD_NOT_FOUND) {
    return true;
  }

  const message = (rpcError.message || '').toLowerCase();
  return (
    message.includes('method not found') ||
    message.includes('unknown method') ||
    message.includes('not supported')
  );
}
