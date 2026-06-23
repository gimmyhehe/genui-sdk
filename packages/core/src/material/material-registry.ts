export type GenuiMaterialComponent = unknown;

export type GenuiMaterialsMap = Record<string, GenuiMaterialComponent>;

export interface GenuiMaterialRegistry {
  components?: GenuiMaterialsMap;
}
