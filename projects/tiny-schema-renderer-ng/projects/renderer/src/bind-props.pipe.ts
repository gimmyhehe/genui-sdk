import { inject, Pipe, PipeTransform } from '@angular/core';
import { applyDefaultPropsToProps } from './apply-default-props';
import { parseData } from './parser/schema-parser';
import { RendererSettingsService } from './renderer-settings.service';

/**
 * 解析 schema props 并补齐物料定义的默认属性值，等价于 Vue 版 getBindProps 中的 parseData + applyDefaultProps。
 */
@Pipe({
  name: 'bindProps',
  standalone: true,
  pure: false,
})
export class BindPropsPipe implements PipeTransform {
  private readonly rendererSettings = inject(RendererSettingsService, { optional: true });

  /**
   * 将 schema.props 解析为运行时 props，并按组件名补齐缺失默认值。
   *
   * @param context - 渲染上下文
   * @param schema - 当前节点 schema
   * @param mergeScope - 循环/作用域合并结果
   * @returns 解析并补齐默认值后的 props 对象
   */
  transform(
    context: Record<string, any>,
    schema: { componentName?: string; props?: Record<string, any> },
    mergeScope: Record<string, any>,
  ): Record<string, any> {
    const props = parseData(schema?.props, mergeScope, context) || {};
    applyDefaultPropsToProps(
      schema?.componentName ?? '',
      props,
      this.rendererSettings?.defaultPropsMap,
    );
    return props;
  }
}
