import { Injectable } from '@angular/core';
import type { DefaultPropsMap } from './apply-default-props';

/**
 * 渲染器运行时配置服务，用于在组件树内共享 defaultPropsMap 等设置。
 */
@Injectable()
export class RendererSettingsService {
  private _defaultPropsMap: DefaultPropsMap = {};

  /**
   * 获取当前组件默认 props 映射表。
   *
   * @returns 组件名到默认 props 的映射
   */
  get defaultPropsMap(): DefaultPropsMap {
    return this._defaultPropsMap;
  }

  /**
   * 更新组件默认 props 映射表。
   *
   * @param map - 新的默认 props 映射，传空则重置为空对象
   */
  setDefaultPropsMap(map: DefaultPropsMap | null | undefined): void {
    this._defaultPropsMap = map ?? {};
  }
}
