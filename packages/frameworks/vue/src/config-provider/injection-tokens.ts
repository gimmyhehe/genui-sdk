import type { InjectionKey, MaybeRef } from 'vue';
import type { IMaterials } from '@opentiny/genui-sdk-core';

export const GENUI_I18N = Symbol('GENUI_I18N');
export const GENUI_CONFIG = Symbol('GENUI_CONFIG');

export const GENUI_MATERIALS: InjectionKey<MaybeRef<IMaterials>> = Symbol('GENUI_MATERIALS');
