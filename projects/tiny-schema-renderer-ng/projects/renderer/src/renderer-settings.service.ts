import { Injectable, InjectionToken } from '@angular/core';

type DefaultValueMap = Record<string, unknown>;

export type DefaultPropsMap = Record<string, DefaultValueMap>;

export interface IRendererSettings {
  defaultPropsMap?: DefaultPropsMap;
}

export const RENDERER_SETTINGS_KEY = new InjectionToken<IRendererSettings>('RENDERER_SETTINGS_KEY');

@Injectable()
export class RendererSettingsService {
  private _defaultPropsMap: DefaultPropsMap = {};

  get defaultPropsMap(): DefaultPropsMap {
    return this._defaultPropsMap;
  }

  setDefaultPropsMap(map: DefaultPropsMap | null | undefined): void {
    this._defaultPropsMap = map ?? {};
  }
}
