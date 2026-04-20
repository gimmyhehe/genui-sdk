import type { IGenPromptCustomConfig } from '@opentiny/genui-sdk-core';

// 内置基准任务定义（id + messages），与落盘后的 {@link LlmBenchmarkSample} 区分
export interface LlmBenchmarkSampleCase {
  id: string;
  messages: LlmBenchmarkMessage[];
}

export interface LlmBenchmarkMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: LlmBenchmarkMessagePayload[];
  finishInfo?: LlmBenchmarkMessageFinishInfo;
}

export interface LlmBenchmarkMessagePayload {
  type: string;
  content: string;
  id?: string;
  name?: string;
  formatPretty?: boolean;
  status?: string;
}

export interface LlmBenchmarkMessageFinishInfo {
  object?: string;
  model?: string;
  created?: number;
  choices?: Array<{
    index?: number;
    delta?: Record<string, unknown>;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * 生成样本时 system prompt 的配置（与 chat-genui 对齐：genPrompt + specificPrompt + userAppendPrompt）。
 */
export type LlmBenchmarkPromptConfig = {
  tgCustomConfig: IGenPromptCustomConfig;
  specificPrompt: string;
  userAppendPrompt: string;
};

/**
 * LLM-as-a-Judge 配置：用于在报告阶段二次评估生成质量。
 */
export type LlmBenchmarkJudgeConfig = {
  // 是否启用 Judge 评估（默认 false）
  enabled?: boolean;
  // Judge 使用的模型 id；为空时默认复用 `model`
  model?: string;
  // 覆盖默认 Judge system prompt
  systemPrompt?: string;
};

export interface LlmBenchmarkRunOptions {
  model: string;
  // 多模型对比：与 model 二选一或并存；有非空项时优先按列表逐模型生成/过滤报告
  models?: string[];
  // 与 chat-genui 一致，决定 genPrompt 使用的物料 render-config（Vue / Angular）
  framework?: 'Vue' | 'Angular';
  // 单场景过滤（兼容旧配置）
  scenario?: string;
  // 多场景过滤（优先级高于 scenario）
  scenarios?: string[];
  // 每个场景重复执行次数，最小为 1
  repeat?: number;
  // 样本生成并发度（最小为 1）
  concurrency?: number;
  // 生成样本用的 system prompt 配置
  promptConfig: LlmBenchmarkPromptConfig;
  // 报告阶段是否启用 LLM-as-a-Judge 质量评估
  llmJudge?: LlmBenchmarkJudgeConfig;
  json?: boolean;
  samplesDir?: string;
  outputDir?: string;
  /**
   * 本次 benchmark 入口开始时间戳（ms）。
   * 若提供，报告阶段会计算「从开始执行到报告输出」总耗时。
   */
  benchmarkStartedAtMs?: number;
}

export interface LlmBenchmarkResultItem {
  scenario: string;
  runIndex?: number;
  // 样本生成时使用的模型 id（如 deepseek-chat）
  model?: string;
  ttftMs: number;
  totalMs: number;
  /**
   * 自请求开始到输出中首次出现 `TinyCard` 节点（`"componentName": "TinyCard"`）的毫秒数；未出现则为 0。
   */
  firstObservableComponentMs: number;
  /** TPOT（Time Per Output Token），ms/token；completionTokens≤1 时无意义，省略 */
  tpotMs?: number;
  isSchemaJsonValidAgainstProtocol: boolean;
  // schema 协议校验失败原因（如缺失字段路径）
  schemaValidationError?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rawOutputChars: number;
  // LLM-as-a-Judge 分数（1~10）
  llmJudgeScore?: number;
  // LLM-as-a-Judge 给出的简要原因
  llmJudgeReason?: string;
  // LLM-as-a-Judge 执行报错（如解析失败、API 错误）
  llmJudgeError?: string;
  errorMessage?: string;
}

export interface LlmBenchmarkSample {
  scenario: string;
  runIndex?: number;
  model: string;
  messages: LlmBenchmarkMessage[];
  output: string;
  generatedAt: string;
  metrics: {
    ttftMs: number;
    totalMs: number;
    /**
     * 自请求开始到首次出现 `TinyCard` 的毫秒数（语义同 {@link LlmBenchmarkResultItem} 同名字段）。
     * 旧版样本可能缺省；报告阶段按 0 处理。
     */
    firstObservableComponentMs?: number;
    /** TPOT（Time Per Output Token），ms/token；completionTokens≤1 时省略 */
    tpotMs?: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    rawOutputChars: number;
    errorMessage?: string;
  };
}
