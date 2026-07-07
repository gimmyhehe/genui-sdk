import type { IMaterialsMeta } from '../material/materials-meta';
import { genPrompt, type IGenPromptCustomConfig, type IGenPromptOptions } from './gen-prompt';
import { vueFrameworkConfig, angularFrameworkConfig, reactFrameworkConfig } from './framework-config';

export interface IGenPromptFrameworkConfig {
  rules?: string[];
}

function mergePromptOptions(frameworkConfig: IGenPromptFrameworkConfig, options: IGenPromptOptions): IGenPromptOptions {
  return {
    ...options,
    rules: [...(frameworkConfig.rules ?? []), ...(options.rules ?? [])],
  };
}

// 高阶函数，封装框架特定的配置，返回一个函数，用于生成特定框架的 prompt
export function genFrameworkPrompt(
  frameworkConfig: IGenPromptFrameworkConfig,
): (materialsMeta: IMaterialsMeta, tgCustomConfig?: IGenPromptCustomConfig, options?: IGenPromptOptions) => string {
  return function (
    materialsMeta: IMaterialsMeta,
    tgCustomConfig?: IGenPromptCustomConfig,
    options?: IGenPromptOptions,
  ) {
    return genPrompt(materialsMeta, tgCustomConfig, mergePromptOptions(frameworkConfig, options ?? {}));
  };
}

export const genVuePrompt = /* @__PURE__*/ genFrameworkPrompt(vueFrameworkConfig);
export const genAngularPrompt = /* @__PURE__*/ genFrameworkPrompt(angularFrameworkConfig);
export const genReactPrompt = /* @__PURE__*/ genFrameworkPrompt(reactFrameworkConfig);