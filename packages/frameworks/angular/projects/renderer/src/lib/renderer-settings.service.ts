import { Inject, Injectable, Optional, SkipSelf } from '@angular/core';
import { type MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { RENDERER_SETTINGS, type IRendererSettings } from '@opentiny/tiny-schema-renderer-ng';
import { GENUI_DEFAULT_PROPS_MAP } from './injection-tokens';

@Injectable()
export class RendererSettingsService implements IRendererSettings {
  constructor(
    @Optional() @SkipSelf() @Inject(RENDERER_SETTINGS) parentSettings: IRendererSettings | null,
    @Optional() @Inject(GENUI_DEFAULT_PROPS_MAP) defaultPropsMap: MaterialDefaultValueMap | null,
  ) {
    Object.assign(this, {
      ...(parentSettings ?? {}),
      defaultPropsMap: defaultPropsMap ?? parentSettings?.defaultPropsMap ?? {},
    });
  }
}
