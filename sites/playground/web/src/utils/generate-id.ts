/**
 * 通用 ID 生成函数
 *
 * 策略优先级：
 * 1. crypto.randomUUID()  — 安全上下文（HTTPS / localhost / Node.js）
 * 2. Date.now() + random  — 带时间戳，有序，适合日志/排序场景
 *
 * @param length  截取长度，默认 16
 * @param prefix  可选前缀，如 'user_', 'order_'
 */
export function generateId(length: number = 16, prefix: string = ''): string {
  let id: string;

  // 策略 1：crypto.randomUUID（最安全，需安全上下文）
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    let raw = '';
    while (raw.length < length) {
      raw += crypto.randomUUID().replace(/-/g, '');
    }
    id = raw.substring(0, length);
  } else {
    // 兜底策略
    const timePart = Date.now ? Date.now().toString(36) : '';
    let raw = timePart;
    while (raw.length < length) {
      raw += Math.random().toString(36).slice(2);
    }
    id = raw.substring(0, length);
  }

  return prefix + id;
}
