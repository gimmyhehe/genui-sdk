/**
 * 从 A2A Part 对象中提取可读文本（兼容 0.3 kind 与 1.0 统一 Part）。
 *
 * @param part - A2A Part 对象
 * @returns 提取到的文本，无则返回空字符串
 */
function extractTextFromPart(part: unknown): string {
  if (!part || typeof part !== 'object') {
    return '';
  }
  const record = part as Record<string, unknown>;
  if (typeof record.text === 'string' && record.text.trim()) {
    return record.text;
  }
  if (typeof record.content === 'string' && record.content.trim()) {
    return record.content;
  }
  return '';
}

/**
 * 从 A2A JSON-RPC result 中提取 agent 回复文本（兼容 Task / Message 等多种返回结构）。
 *
 * @param result - JSON-RPC result 字段
 * @returns 可读文本；无法提取时返回 JSON 字符串
 */
export function extractA2aResponseText(result: unknown): string {
  if (result == null) {
    return '';
  }
  if (typeof result === 'string') {
    return result;
  }
  if (typeof result !== 'object') {
    return String(result);
  }

  const record = result as Record<string, unknown>;
  const textParts: string[] = [];

  const collectParts = (parts: unknown) => {
    if (!Array.isArray(parts)) {
      return;
    }
    for (const part of parts) {
      const text = extractTextFromPart(part);
      if (text) {
        textParts.push(text);
      }
    }
  };

  if (record.message && typeof record.message === 'object') {
    collectParts((record.message as Record<string, unknown>).parts);
  }

  collectParts(record.parts);

  if (Array.isArray(record.artifacts)) {
    for (const artifact of record.artifacts) {
      if (artifact && typeof artifact === 'object') {
        collectParts((artifact as Record<string, unknown>).parts);
      }
    }
  }

  const status = record.status;
  if (status && typeof status === 'object') {
    const statusMessage = (status as Record<string, unknown>).message;
    if (statusMessage && typeof statusMessage === 'object') {
      collectParts((statusMessage as Record<string, unknown>).parts);
    }
  }

  if (textParts.length) {
    return textParts.join('\n');
  }

  return JSON.stringify(result);
}
