import { InjectionToken } from '@angular/core';
import type { IRendererMaterials } from './renderer-materials';

type DefaultValueMap = Record<string, unknown>;

export type DefaultPropsMap = Record<string, DefaultValueMap>;

export interface IRendererSettings {
  defaultPropsMap?: DefaultPropsMap;
  materials?: IRendererMaterials;
}

export const RENDERER_SETTINGS = new InjectionToken<IRendererSettings>('RENDERER_SETTINGS');
