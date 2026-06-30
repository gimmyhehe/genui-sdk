import type { IMaterialsConfig, IExample } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import builtinJson from './builtin.json' with { type: 'json' };
import chartJson from './chart.json' with { type: 'json' };
import extendJson from './extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { miniWhiteList, standardWhiteList, whiteList } from './white-list';

export type { IMaterialsConfig, IPromptSectionConfig, IExample } from '@opentiny/genui-sdk-core';

const BASE_CONFIG = {
  materials: [bundleJson, builtinJson, chartJson, extendJson],
  wrapperComponent: 'TinyCard',
};

const filterExamples = (ids: string[]) =>
  allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));

export const miniMaterialsConfig: IMaterialsConfig = {
  ...BASE_CONFIG,
  whiteList: miniWhiteList,
  examples: filterExamples(['form', 'grid']),
  promptConfig: { includeJsonSchema: false, includeSnippets: false },
};

export const standardMaterialsConfig: IMaterialsConfig = {
  ...BASE_CONFIG,
  whiteList: standardWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs']),
  promptConfig: { includeJsonSchema: true, includeSnippets: true },
};

export const plusMaterialsConfig: IMaterialsConfig = {
  ...BASE_CONFIG,
  whiteList: whiteList,
  examples: allExamples,
  promptConfig: { includeJsonSchema: true, includeSnippets: true },
};

export const MATERIALS_CONFIG_MAP = {
  mini: miniMaterialsConfig,
  standard: standardMaterialsConfig,
  plus: plusMaterialsConfig,
} as const;

export type VariantKey = keyof typeof MATERIALS_CONFIG_MAP;

export const materialsConfig = standardMaterialsConfig;
