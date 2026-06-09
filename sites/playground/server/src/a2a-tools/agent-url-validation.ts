import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * 规范化 URL hostname：去掉 IPv6 方括号与末尾根域点。
 *
 * @param host - URL hostname
 * @returns 规范化后的 host
 */
function normalizeHostname(host: string): string {
  const trimmed = host.endsWith('.') ? host.slice(0, -1) : host;

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * 从 IPv4-mapped IPv6 地址中提取映射的 IPv4 字符串。
 *
 * @param host - IPv6 字符串（如 `::ffff:127.0.0.1` 或 `::ffff:7f00:1`）
 * @returns 映射的 IPv4，无法解析时返回 `null`
 */
function extractMappedIpv4(host: string): string | null {
  const lower = host.toLowerCase();
  if (!lower.startsWith('::ffff:')) {
    return null;
  }

  const tail = host.slice('::ffff:'.length);

  if (net.isIP(tail) === 4) {
    return tail;
  }

  const [hi, lo] = tail.split(':');
  if (hi && lo) {
    const hiNum = Number.parseInt(hi, 16);
    const loNum = Number.parseInt(lo, 16);
    if (!Number.isNaN(hiNum) && !Number.isNaN(loNum)) {
      const a = (hiNum >> 8) & 0xff;
      const b = hiNum & 0xff;
      const c = (loNum >> 8) & 0xff;
      const d = loNum & 0xff;
      return `${a}.${b}.${c}.${d}`;
    }
  }

  return null;
}

/**
 * 判断 IPv4 地址是否属于本地/内网/链路本地等应阻断的范围。
 *
 * @param host - IPv4 字符串
 * @returns 是否为应阻断的 IPv4 地址
 */
function isPrivateIpv4(host: string): boolean {
  if (net.isIP(host) !== 4) {
    return false;
  }

  const parts = host.split('.').map((v) => Number(v));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = parts;

  if (a === 0) return true;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * 判断 IPv6 地址是否属于本地/内网/链路本地等应阻断的范围。
 *
 * @param host - IPv6 字符串
 * @returns 是否为应阻断的 IPv6 地址
 */
function isPrivateIpv6(host: string): boolean {
  if (net.isIP(host) !== 6) {
    return false;
  }

  const lower = host.toLowerCase();

  if (lower === '::1' || lower === '::') {
    return true;
  }

  // fe80::/10 — IPv6 link-local
  if (/^fe[89ab]/.test(lower)) {
    return true;
  }

  // fc00::/7 — unique local addresses
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }

  // IPv4-mapped IPv6（如 ::ffff:127.0.0.1 或 URL 规范化后的 ::ffff:7f00:1）
  const mappedIpv4 = extractMappedIpv4(host);
  if (mappedIpv4 && isPrivateIpv4(mappedIpv4)) {
    return true;
  }

  return false;
}

/**
 * 判断 host 是否为本地/内网地址（只做显式阻断，非完整 RFC 覆盖）。
 *
 * @param host - URL hostname 或 IP 字符串
 * @returns 是否为本地或内网地址
 */
export function isPrivateOrLocalHost(host: string): boolean {
  const normalizedHost = normalizeHostname(host);
  const lower = normalizedHost.toLowerCase();

  if (lower === 'localhost' || lower.endsWith('.localhost') || lower === '127.0.0.1' || lower === '::1') {
    return true;
  }

  const ipVersion = net.isIP(normalizedHost);
  if (!ipVersion) {
    return false;
  }

  if (ipVersion === 4) {
    return isPrivateIpv4(normalizedHost);
  }

  return isPrivateIpv6(normalizedHost);
}

/**
 * 解析 hostname 对应的 A/AAAA 记录；字面量 IP 直接返回自身。
 *
 * @param hostname - 已规范化的 hostname
 * @returns 解析到的 IP 列表，无记录时返回空数组
 */
async function resolveHostAddresses(hostname: string): Promise<string[]> {
  const normalized = normalizeHostname(hostname);

  if (net.isIP(normalized)) {
    return [normalized];
  }

  const addresses: string[] = [];

  try {
    addresses.push(...(await dns.resolve4(normalized)));
  } catch (error: any) {
    if (error?.code !== 'ENOTFOUND' && error?.code !== 'ENODATA') {
      throw error;
    }
  }

  try {
    addresses.push(...(await dns.resolve6(normalized)));
  } catch (error: any) {
    if (error?.code !== 'ENOTFOUND' && error?.code !== 'ENODATA') {
      throw error;
    }
  }

  return addresses;
}

/**
 * 校验 Agent URL 的字面量 hostname（同步，不含 DNS 解析）。
 *
 * @param urlStr - 待校验 URL
 * @returns 是否通过字面量校验
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

/**
 * 校验 Agent URL：字面量 hostname 校验 + DNS 解析结果不得为内网/本地地址。
 *
 * @param urlStr - 待校验 URL
 * @returns 是否允许访问
 */
export async function isAllowedAgentUrlResolved(urlStr: string): Promise<boolean> {
  try {
    if (!isAllowedAgentUrl(urlStr)) {
      return false;
    }

    const hostname = normalizeHostname(new URL(urlStr).hostname);
    if (net.isIP(hostname)) {
      return true;
    }

    const addresses = await resolveHostAddresses(hostname);
    if (addresses.length === 0) {
      return false;
    }

    return addresses.every((address) => !isPrivateOrLocalHost(address));
  } catch {
    return false;
  }
}
