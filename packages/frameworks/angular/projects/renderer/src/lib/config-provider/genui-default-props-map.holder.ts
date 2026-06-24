import { Injectable } from '@angular/core';
import { buildMaterialDefaultValueMap, type IRendererConfig, type MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';

@Injectable()
export class GenuiDefaultPropsMapHolder {
  readonly defaultPropsMap: MaterialDefaultValueMap = {};

  update(rendererConfig: Partial<IRendererConfig> = {}): void {
    const newMap = buildMaterialDefaultValueMap(rendererConfig);
    Object.keys(this.defaultPropsMap).forEach((key) => delete this.defaultPropsMap[key]);
    Object.assign(this.defaultPropsMap, newMap);
  }
}
