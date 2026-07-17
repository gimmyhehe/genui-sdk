import {
  genPrompt,
  type IGenPromptCustomConfig,
  type IGenPromptOptions,
  type IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import type { MaterialsMetaVariantKey } from '../types/index.js';

const vueMaterialsMetaByVariant = {
  mini: miniMaterialsMeta,
  standard: materialsMeta,
} as const;

const MATERIALS_META_BY_FRAMEWORK: Record<
  string,
  (promptVariant?: MaterialsMetaVariantKey) => IMaterialsMeta
> = {
  Angular: () => ngMaterialsMeta,
  Vue: (promptVariant) =>
    promptVariant ? vueMaterialsMetaByVariant[promptVariant] : materialsMeta,
};

export function getGenPromptOptions(promptVariant?: MaterialsMetaVariantKey): IGenPromptOptions | undefined {
  if (promptVariant === 'mini') {
    return { includeJsonSchema: false, includeSnippets: false };
  }
}

export function getMaterialsMetaForFramework(
  framework: string,
  promptVariant?: MaterialsMetaVariantKey,
): IMaterialsMeta {
  const resolve = MATERIALS_META_BY_FRAMEWORK[framework] ?? MATERIALS_META_BY_FRAMEWORK.Vue;
  return resolve(promptVariant);
}

export function genPlaygroundPrompt(
  framework: string,
  promptVariant: MaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  return genPrompt(
    framework,
    getMaterialsMetaForFramework(framework, promptVariant),
    tgCustomConfig,
    getGenPromptOptions(promptVariant),
  );
}
