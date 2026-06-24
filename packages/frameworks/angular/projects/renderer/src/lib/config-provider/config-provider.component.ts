import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import type { IRendererConfig } from '@opentiny/genui-sdk-core';
import { GENUI_DEFAULT_PROPS_MAP } from '../injection-tokens';
import { GenuiDefaultPropsMapHolder } from './genui-default-props-map.holder';

export interface GenuiConfigProviderProps {
  id?: string;
  rendererConfig?: Partial<IRendererConfig>;
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
    GenuiDefaultPropsMapHolder,
    {
      provide: GENUI_DEFAULT_PROPS_MAP,
      useFactory: (holder: GenuiDefaultPropsMapHolder) => holder.defaultPropsMap,
      deps: [GenuiDefaultPropsMapHolder],
    },
  ],
})
export class GenuiConfigProvider implements OnChanges {
  @Input() id = 'tiny-genui-config-provider';
  @Input() rendererConfig?: Partial<IRendererConfig>;

  constructor(private readonly defaultPropsMapHolder: GenuiDefaultPropsMapHolder) {
    this.syncConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rendererConfig']) {
      this.syncConfig();
    }
  }

  private syncConfig(): void {
    this.defaultPropsMapHolder.update(this.rendererConfig ?? {});
  }
}
