import net from 'node:net';

/** Playground 是否处于开发模式（开发环境跳过 Agent URL SSRF 校验）。 */
export const isPlaygroundDevelopment = process.env.NODE_ENV === 'development';

/**
 * 判断 host 是否为本地/内网地址（只做显式阻断，非完整 RFC 覆盖）。
 *
 * @param host - URL hostname
 * @returns 是否为本地或内网地址
 */
function isPrivateOrLocalHost(host: string): boolean {
  const lower = host.toLowerCase().replace(/\.$/, '');

  if (lower === 'localhost' || lower.endsWith('.localhost') || lower === '127.0.0.1' || lower === '::1') {
    return true;
  }

  const ipVersion = net.isIP(lower);
  if (!ipVersion) {
    return false;
  }

  if (ipVersion === 4) {
    const [a, b] = lower.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }

  // IPv6：常见私有/本地前缀
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) {
    return true;
  }

  return false;
}

/**
 * 校验 Agent URL（Playground 演练场：仅字面量 hostname，不做 DNS 解析）。
 *
 * @param urlStr - 待校验 URL
 * @returns 是否允许访问
 */
export function isAllowedAgentUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }

    if (isPrivateOrLocalHost(u.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
