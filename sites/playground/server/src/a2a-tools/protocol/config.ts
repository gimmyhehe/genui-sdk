import type { A2aProtocolBinding, A2aProtocolVersion } from './types.js';

export const A2A_PROTOCOL_CONFIG = {
  supportedVersions: ['1.0', '0.3'] as A2aProtocolVersion[],
  supportedBindings: ['JSONRPC', 'HTTP+JSON'] as A2aProtocolBinding[],
} as const;
