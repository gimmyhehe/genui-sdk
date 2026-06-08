import net from 'node:net';

/**
 * 判断 host 是否为本地/内网地址（只做显式阻断，非完整 RFC 覆盖）。
 *
 * @param host - URL hostname
 * @returns 是否为本地或内网地址
 */
export function isPrivateOrLocalHost(host: string): boolean {
  const lower = host.toLowerCase();

  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') {
    return true;
  }

  const ipVersion = net.isIP(host);
  if (!ipVersion) {
    return false;
  }

  if (ipVersion === 4) {
    const [a, b] = host.split('.').map((v) => Number(v));

    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  if (ipVersion === 6) {
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  }

  return false;
}

/**
 * 校验 Agent URL，仅允许公网 http/https 目标（用于 SSRF 防护）。
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
