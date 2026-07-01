
export type GenuiMaterialComponent = unknown;

export type GenuiMaterialsMap = Record<string, GenuiMaterialComponent>;

export interface IMaterials {
  components?: GenuiMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
}
