import type { IMaterialsMeta } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import { examples } from './example-schema';
import { whiteList } from './white-list';

export const ngMaterialsConfig: IMaterialsMeta = {
  materials: [bundleJson],
  examples,
  whiteList,
  wrapperComponent: 'TiCard',
};
