import { Injectable } from '@angular/core';
import { buildMaterialDefaultValueMap, type IRendererConfig, type MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';

/**
 * 持有物料默认 props 映射表，供 ConfigProvider provide 并在输入变更时原地更新。
 */
@Injectable()
export class GenuiDefaultPropsMapHolder {
  readonly defaultPropsMap: MaterialDefaultValueMap = {};

  /**
   * 根据渲染器配置重建默认 props 映射，并保持对象引用稳定。
   *
   * @param rendererConfig - 渲染器物料配置
   */
  update(rendererConfig: Partial<IRendererConfig> = {}): void {
    const newMap = buildMaterialDefaultValueMap(rendererConfig);
    Object.keys(this.defaultPropsMap).forEach((key) => delete this.defaultPropsMap[key]);
    Object.assign(this.defaultPropsMap, newMap);
  }
}
