import { type Type } from '@angular/core';

export type AutoApplyDirectivePattern = Record<string, (schema: any) => boolean>;

export interface IRendererMaterials {
  components?: Record<string, Type<any>>;
  modules?: Record<string, Type<any>>;
  directives?: Record<string, Type<any>>;
  autoApplyDirectives?: AutoApplyDirectivePattern;
}

export const MATERIALS_CONTEXT_KEY = Symbol('renderer-materials');
