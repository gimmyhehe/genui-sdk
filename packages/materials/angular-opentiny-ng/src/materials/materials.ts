import type { Type } from '@angular/core';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import { autoApplyDirectives, directives } from './directives';
import { components, modules } from './components';

export type AutoApplyDirectivePattern = Record<string, (schema: any) => boolean>;

export interface INgMaterials extends IMaterials {
  modules?: Record<string, Type<any>>;
  directives?: Record<string, Type<any>>;
  autoApplyDirectives?: AutoApplyDirectivePattern;
}

export const materials: INgMaterials = {
  components,
  modules,
  directives,
  autoApplyDirectives,
};
