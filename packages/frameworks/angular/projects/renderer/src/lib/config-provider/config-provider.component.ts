import { Component, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { buildMaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import type { IMaterialsMeta, IMaterials, MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { GENUI_DEFAULT_PROPS_MAP, GENUI_MATERIALS } from '../injection-tokens';

export interface GenuiConfigProviderProps {
  id?: string;
  rendererConfig?: Partial<IMaterialsMeta>;
  materials?: IMaterials;
}

@Component({
  selector: 'genui-config-provider',
  standalone: true,
  template: '<ng-content></ng-content>',
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  providers: [
    {
      provide: GENUI_MATERIALS,
      useFactory: (provider: GenuiConfigProvider) => provider.materials,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
    {
      provide: GENUI_DEFAULT_PROPS_MAP,
      useFactory: (provider: GenuiConfigProvider) => provider.defaultPropsMap,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
  ],
})
export class GenuiConfigProvider implements OnChanges {
  @Input() id = 'tiny-genui-config-provider';
  @Input() rendererConfig?: Partial<IMaterialsMeta>;

  readonly materials: IMaterials = {};
  readonly defaultPropsMap: MaterialDefaultValueMap = {};

  @Input('materials')
  set materialsInput(value: IMaterials | undefined) {
    Object.keys(this.materials).forEach((key) => delete (this.materials as Record<string, unknown>)[key]);
    Object.assign(this.materials, value ?? {});
  }

  constructor() {
    this.syncConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rendererConfig']) {
      this.syncConfig();
    }
  }

  private syncConfig(): void {
    const newMap = buildMaterialDefaultValueMap(this.rendererConfig ?? {});
    Object.keys(this.defaultPropsMap).forEach((key) => delete this.defaultPropsMap[key]);
    Object.assign(this.defaultPropsMap, newMap);
  }
}
