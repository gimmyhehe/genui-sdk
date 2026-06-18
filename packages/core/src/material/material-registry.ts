/**
 * 运行时物料组件实现，兼容 Vue / React / Angular 等各前端框架。
 */
export type GenuiMaterialComponent = unknown;

/**
 * Schema 渲染器使用的组件物料映射表。
 */
export type GenuiMaterialsMap = Record<string, GenuiMaterialComponent>;

/**
 * ConfigProvider 接收的物料注册表结构。
 */
export interface GenuiMaterials {
  components?: GenuiMaterialsMap;
}
