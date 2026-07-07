import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta/standard';
import { components } from './components';
import { requiredCompleteFieldSelectors as baseRequiredCompleteFieldSelectors } from './shared';

const requiredCompleteFieldSelectors = [
  ...baseRequiredCompleteFieldSelectors,
  '[componentName=TinyTransfer] > props > data',
  '[componentName^=TinyHuicharts] > props > options > theme',
];

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
