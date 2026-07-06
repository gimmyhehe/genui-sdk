import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../materials-meta/mini';
import { components } from './components';
import { requiredCompleteFieldSelectors } from './shared';

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
