import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import type { IRendererConfig } from '@opentiny/genui-sdk-core';
import { GENUI_DEFAULT_PROPS_MAP } from '../injection-tokens';
import { GenuiDefaultPropsMapHolder } from './genui-default-props-map.holder';

export interface GenuiConfigProviderProps {
  id?: string;
  rendererConfig?: Partial<IRendererConfig>;
}

/**
 * Genui Angular 全局配置提供者，向子树注入默认 props 映射。
 * 对齐 Vue 版 GenuiConfigProvider 中 defaultPropsMap 的 provide 语义。
 */
@Component({
  selector: 'genui-config-provider',
  standalone: true,
  template: '<ng-content></ng-content>',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
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

  /**
   * 将当前 rendererConfig 同步到 holder，触发默认 props 映射更新。
   */
  private syncConfig(): void {
    this.defaultPropsMapHolder.update(this.rendererConfig ?? {});
  }
}
