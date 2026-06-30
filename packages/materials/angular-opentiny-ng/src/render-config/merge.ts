import type { IMaterialsConfig } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import { examples } from './example-schema';
import { whiteList } from './white-list';

export const ngMaterialsConfig: IMaterialsConfig = {
  materials: [bundleJson],
  examples,
  whiteList,
  wrapperComponent: 'TiCard',
};
