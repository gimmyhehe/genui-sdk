import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsConfig } from '../render-config/merge';
import { components } from './components';
import { requiredCompleteFieldSelectors } from './required-complete-field-selectors';

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsConfig),
};
