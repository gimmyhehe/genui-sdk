import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import builtinJson from './materials/builtin.json' with { type: 'json' };
import chartJson from './materials/chart.json' with { type: 'json' };
import extendJson from './materials/extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { miniWhiteList, standardWhiteList } from './white-list';

export type { IMaterialsMeta, IExample } from '@opentiny/genui-sdk-core';

// TODO: 优化物料协议后，删除 as IMaterialsProtocol[]
const baseMetaMaterials = [bundleJson, builtinJson, extendJson] as IMaterialsProtocol[];

const standardMetaMaterials = [chartJson, ...baseMetaMaterials] as IMaterialsProtocol[];

const MINI_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
];

const STANDARD_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
  '禁止设置饼图的 `settings.radius`',
];

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta = {
  materials: standardMetaMaterials,
  wrapperComponent: 'TinyCard',
  whiteList: standardWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs']),
  rules: STANDARD_RULES,
};

export const miniMaterialsMeta = {
  materials: baseMetaMaterials,
  wrapperComponent: 'TinyCard',
  whiteList: miniWhiteList,
  examples: filterExamples(['form', 'grid']),
  rules: MINI_RULES,
};
