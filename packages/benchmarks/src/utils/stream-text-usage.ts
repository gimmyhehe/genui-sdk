import { streamText } from 'ai';

type StreamTextResult = ReturnType<typeof streamText>;

/**
 * 消费 `fullStream` 后解析最终 token 用量。
 * 部分提供商在流式 `finish` 分片的 `totalUsage` 中字段为空，需在消费流后 `await totalUsage` 才能得到 AI SDK 汇总的用量。
 */
export async function resolveStreamTextUsage(streamResult: StreamTextResult): Promise<{
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
}> {
  try {
    const u = await streamResult.totalUsage;
    return {
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
    };
  } catch {
    return { inputTokens: undefined, outputTokens: undefined, totalTokens: undefined };
  }
}
