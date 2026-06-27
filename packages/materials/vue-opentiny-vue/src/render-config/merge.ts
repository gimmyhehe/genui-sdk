import bundleJson from './bundle.json' with { type: 'json' };
import builtinJson from './builtin.json' with { type: 'json' };
import chartJson from './chart.json' with { type: 'json' };
import extendJson from './extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { miniWhiteList, standardWhiteList, whiteList } from './white-list';

export interface IPromptSectionConfig {
  includeJsonSchema?: boolean;
  includeSnippets?: boolean;
}

export interface IRendererConfig {
  materialsList: any[];
  examples: any[];
  whiteList: string[];
  wrapperComponent?: string;
  prompt?: IPromptSectionConfig;
}

const BASE_CONFIG = {
  materialsList: [bundleJson, builtinJson, chartJson, extendJson],
  wrapperComponent: 'TinyCard',
};

const filterExamples = (ids: string[]) =>
  allExamples.filter((example) => example.id && ids.includes(example.id));

export const miniRendererConfig: IRendererConfig = {
  ...BASE_CONFIG,
  whiteList: miniWhiteList,
  examples: filterExamples(['form', 'grid']),
  prompt: { includeJsonSchema: false, includeSnippets: false },
};

export const standardRendererConfig: IRendererConfig = {
  ...BASE_CONFIG,
  whiteList: standardWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs']),
  prompt: { includeJsonSchema: true, includeSnippets: true },
};

export const plusRendererConfig: IRendererConfig = {
  ...BASE_CONFIG,
  whiteList: whiteList,
  examples: allExamples,
  prompt: { includeJsonSchema: true, includeSnippets: true },
};

export const RENDERER_CONFIGS = {
  mini: miniRendererConfig,
  standard: standardRendererConfig,
  plus: plusRendererConfig,
} as const;

export type RendererConfigKey = keyof typeof RENDERER_CONFIGS;

export function getRendererConfig(key?: string): IRendererConfig {
  if (key && key in RENDERER_CONFIGS) {
    return RENDERER_CONFIGS[key as RendererConfigKey];
  }
  return standardRendererConfig;
}

export const rendererConfig = standardRendererConfig;
