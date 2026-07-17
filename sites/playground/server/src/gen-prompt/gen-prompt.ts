import {
  genPrompt,
  type IGenPromptCustomConfig,
} from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import type { MaterialsMetaVariantKey } from '../types/index.js';

const metaMap = {
  Vue: {
    mini: miniMaterialsMeta,
    standard: materialsMeta,
  },
  Angular: {
    mini: ngMaterialsMeta,
    standard: ngMaterialsMeta,
  },
} as const;

const optionsMap = {
  Vue: {
    mini: { includeJsonSchema: false, includeSnippets: false },
    standard: {},
  },
  Angular: {
    mini: { },
    standard: {},
  },
} as const;

export function genPlaygroundPrompt(
  framework: string,
  promptVariant: MaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  return genPrompt(
    framework,
    metaMap[framework as keyof typeof metaMap]?.[promptVariant] ?? materialsMeta,
    tgCustomConfig,
    optionsMap[framework as keyof typeof optionsMap]?.[promptVariant] ?? {},
  );
}
