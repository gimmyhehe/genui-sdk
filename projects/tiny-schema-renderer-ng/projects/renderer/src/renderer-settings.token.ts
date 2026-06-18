import { InjectionToken } from '@angular/core';
import type { DefaultPropsMap } from './apply-default-props';

/**
 * 渲染器运行时设置，由框架层 provide、基础渲染器 inject。
 * 对齐 Vue 版 RENDERER_SETTINGS_KEY。
 */
export interface IRendererSettings {
  defaultPropsMap?: DefaultPropsMap;
}

export const RENDERER_SETTINGS_KEY = new InjectionToken<IRendererSettings>('RENDERER_SETTINGS_KEY');
