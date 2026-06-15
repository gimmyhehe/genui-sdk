import type { A2aProtocolBinding } from '../types.js';
import { httpJsonBindingTransport } from './http-json.js';
import { jsonRpcBindingTransport } from './json-rpc.js';
import type { A2aProtocolBindingTransport } from './types.js';

const transportMap = new Map<A2aProtocolBinding, A2aProtocolBindingTransport>([
  [jsonRpcBindingTransport.binding, jsonRpcBindingTransport],
  [httpJsonBindingTransport.binding, httpJsonBindingTransport],
]);

/**
 * 获取指定 binding 的传输层实现。
 *
 * @param binding - 协议 binding
 * @returns 传输层实例；未注册时返回 `undefined`
 */
export function getA2aBindingTransport(
  binding: A2aProtocolBinding,
): A2aProtocolBindingTransport | undefined {
  return transportMap.get(binding);
}
