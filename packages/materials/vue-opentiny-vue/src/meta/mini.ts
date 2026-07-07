import { createMaterialsMeta, MINI_RULES } from './shared';
import { miniWhiteList } from './white-list';

export const materialsMeta = createMaterialsMeta(miniWhiteList, ['form', 'grid'], MINI_RULES);
