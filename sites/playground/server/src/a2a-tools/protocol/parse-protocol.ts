import type { A2aProtocolBinding, A2aProtocolVersion } from './types.js';

/**
 * 将 Agent Card 中的 protocolBinding 字符串规范化为 Playground 支持的标准 binding。
 *
 * @param raw - 原始 binding 字符串
 * @returns 规范化后的 binding，无法识别时返回 `null`
 */
export function parseA2aProtocolBinding(raw: string | undefined | null): A2aProtocolBinding | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (normalized === 'JSONRPC') {
    return 'JSONRPC';
  }
  if (normalized === 'HTTP+JSON') {
    return 'HTTP+JSON';
  }

  return null;
}

/**
 * 将 Agent Card 中的协议版本字符串解析为 Playground 支持的版本号。
 *
 * @param raw - 原始版本字符串（如 `0.3.0`、`1.0`）
 * @returns 解析成功返回 `'0.3'` 或 `'1.0'`，无法识别时返回 `null`
 */
export function parseA2aProtocolVersion(raw: string | undefined | null): A2aProtocolVersion | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const major = normalized.split('.')[0];
  if (major === '1') {
    return '1.0';
  }

  if (major === '0') {
    return '0.3';
  }

  return null;
}
