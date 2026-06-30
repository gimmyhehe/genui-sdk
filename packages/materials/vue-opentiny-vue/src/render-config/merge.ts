import type { IMaterialsConfig, IExample } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import builtinJson from './builtin.json' with { type: 'json' };
import chartJson from './chart.json' with { type: 'json' };
import extendJson from './extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { miniWhiteList, standardWhiteList } from './white-list';

export type { IMaterialsConfig, IPromptSectionConfig, IExample } from '@opentiny/genui-sdk-core';

const MINI_ADDITION_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
];

const STANDARD_ADDITION_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
  '禁止设置饼图的 `settings.radius`',
];

const BASE_CONFIG = {
  materials: [bundleJson, builtinJson, chartJson, extendJson],
  wrapperComponent: 'TinyCard',
  additionRules: MINI_ADDITION_RULES,
};

const filterExamples = (ids: string[]) =>
  allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));

export const miniMaterialsConfig: IMaterialsConfig = {
  ...BASE_CONFIG,
  whiteList: miniWhiteList,
  examples: filterExamples(['form', 'grid']),
  promptConfig: { includeSnippets: false },
};

export const standardMaterialsConfig: IMaterialsConfig = {
  ...BASE_CONFIG,
  whiteList: standardWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs']),
  additionRules: STANDARD_ADDITION_RULES,
};

export const MATERIALS_CONFIG_MAP = {
  mini: miniMaterialsConfig,
  standard: standardMaterialsConfig,
} as const;

export type VariantKey = keyof typeof MATERIALS_CONFIG_MAP;

export const materialsConfig = standardMaterialsConfig;
