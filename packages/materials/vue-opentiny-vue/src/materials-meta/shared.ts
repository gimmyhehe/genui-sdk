import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import builtinJson from './builtin.json' with { type: 'json' };
import chartJson from './chart.json' with { type: 'json' };
import extendJson from './extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';

export type { IMaterialsMeta, IExample } from '@opentiny/genui-sdk-core';

// TODO: 优化物料协议后，删除 as IMaterialsProtocol[]
const materialsProtocols = [bundleJson, builtinJson, chartJson, extendJson] as IMaterialsProtocol[];

export const MINI_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
];

export const STANDARD_RULES = [
  '表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
  '禁止设置饼图的 `settings.radius`',
];

const filterExamples = (ids: string[]) =>
  allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));

export function createMaterialsMeta(
  whiteList: string[],
  exampleIds: string[],
  rules: string[],
): IMaterialsMeta {
  return {
    materials: materialsProtocols,
    wrapperComponent: 'TinyCard',
    whiteList,
    examples: filterExamples(exampleIds),
    rules,
  };
}
