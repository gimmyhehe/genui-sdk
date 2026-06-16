import { ServiceParameters, type RequestOptions } from '@a2a-js/sdk/client';

/**
 * 将 HTTP 头与取消信号转为官方 SDK RequestOptions。
 *
 * @param headers - HTTP 请求头（含认证信息）
 * @param abortSignal - 可选取消信号
 * @returns SDK RequestOptions
 */
export function buildSdkRequestOptions(
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): RequestOptions {
  const serviceParameters =
    Object.keys(headers).length > 0
      ? ServiceParameters.createFrom(undefined, (params) => ({ ...params, ...headers }))
      : undefined;

  return {
    signal: abortSignal,
    serviceParameters,
  };
}
