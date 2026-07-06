import type { IMaterialsMeta, IExample } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import builtinJson from './builtin.json' with { type: 'json' };
import chartJson from './chart.json' with { type: 'json' };
import extendJson from './extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { miniWhiteList, standardWhiteList } from './white-list';

export type { IMaterialsMeta, IExample } from '@opentiny/genui-sdk-core';

const MINI_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
];

const STANDARD_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
  '禁止设置饼图的 `settings.radius`',
];

const BASE_CONFIG = {
  materials: [bundleJson, builtinJson, chartJson, extendJson],
  wrapperComponent: 'TinyCard',
  rules: MINI_RULES,
};

const filterExamples = (ids: string[]) =>
  allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));

export const miniMaterialsMeta: IMaterialsMeta = {
  ...BASE_CONFIG,
  whiteList: miniWhiteList,
  examples: filterExamples(['form', 'grid']),
};

export const standardMaterialsMeta: IMaterialsMeta = {
  ...BASE_CONFIG,
  whiteList: standardWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs']),
  rules: STANDARD_RULES,
};

export const materialsMetaMap = {
  mini: miniMaterialsMeta,
  standard: standardMaterialsMeta,
} as const;

export type MaterialsMetaVariantKey = keyof typeof materialsMetaMap;

export const materialsMeta = standardMaterialsMeta;
