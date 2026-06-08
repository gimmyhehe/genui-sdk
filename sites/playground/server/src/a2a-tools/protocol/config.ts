import type { A2aProtocolVersion } from './types.js';

/**
 * Playground A2A 协议运行时配置（集中开关）。
 *
 * 弃用 0.3 时只需：
 * 1. 将 `supportedVersions` 改为 `['1.0']`
 * 2. 将 `defaultVersion` 改为 `'1.0'`
 * 3. 视情况关闭 `enableVersionFallback`
 * 4. 删除 `adapters/v0_3.ts` 及其注册
 */
export const A2A_PROTOCOL_CONFIG = {
  /** 当前启用的协议版本（顺序不影响 fallback，仅表示支持范围）。 */
  supportedVersions: ['0.3', '1.0'] as A2aProtocolVersion[],

  /** Card 无法推断版本时使用的默认版本。 */
  defaultVersion: '1.0' as A2aProtocolVersion,

  /**
   * 是否在首选版本 RPC 失败（如 Method not found）时尝试其他已启用版本。
   * 全面切到 1.0 后可设为 `false`。
   */
  enableVersionFallback: true,
} as const;
