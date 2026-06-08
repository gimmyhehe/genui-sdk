import type { A2aProtocolBinding } from '../types.js';
import { httpJsonBindingTransport } from './http-json.js';
import { jsonRpcBindingTransport } from './json-rpc.js';
import type { A2aProtocolBindingTransport } from './types.js';

/** 全部已知 binding 传输层。新增 binding 在此注册。 */
const ALL_BINDING_TRANSPORTS: A2aProtocolBindingTransport[] = [
  jsonRpcBindingTransport,
  httpJsonBindingTransport,
];

const transportMap = new Map<A2aProtocolBinding, A2aProtocolBindingTransport>(
  ALL_BINDING_TRANSPORTS.map((transport) => [transport.binding, transport]),
);

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

export { jsonRpcBindingTransport, httpJsonBindingTransport };
