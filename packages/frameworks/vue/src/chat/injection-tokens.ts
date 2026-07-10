import type { InjectionKey } from 'vue';
import type { GenuiMaterialsMap, MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';

export const GENUI_I18N = Symbol('GENUI_I18N');
export const GENUI_CONFIG = Symbol('GENUI_CONFIG');
export const CUSTOM_CONTEXT = Symbol('CUSTOM_CONTEXT');

export const GENUI_MATERIALS: InjectionKey<GenuiMaterialsMap> = Symbol('GENUI_MATERIALS');

export const GENUI_DEFAULT_PROPS_MAP: InjectionKey<MaterialDefaultValueMap> = Symbol('GENUI_DEFAULT_PROPS_MAP');
