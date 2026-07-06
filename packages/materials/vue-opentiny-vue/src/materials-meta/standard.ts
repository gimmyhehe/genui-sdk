import { createMaterialsMeta, STANDARD_RULES } from './shared';
import { standardWhiteList } from './white-list';

export const materialsMeta = createMaterialsMeta(
  standardWhiteList,
  ['form', 'info', 'grid', 'tabs'],
  STANDARD_RULES,
);
