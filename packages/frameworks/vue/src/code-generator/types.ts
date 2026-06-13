import type { CardSchema } from '@opentiny/genui-sdk-core';

export interface IComponentMapItem {
  componentName: string;
  package: string;
  exportName?: string;
}

/** state.accessor getter/setter 出码为 computed 的声明信息。 */
export interface IStateAccessorDefinition {
  name: string;
  getterExpr: string;
  setterExpr?: string;
}

export interface ICodegenDescription {
  componentSet: Set<string>;
  iconComponents: { componentNames: string[]; exportNames: string[] };
  internalTypes: Set<string>;
  /** 含 accessor 的 state 字段，出码为独立 computed，不放入 reactive。 */
  stateAccessors: IStateAccessorDefinition[];
}

export interface ICodePanel {
  panelName: string;
  panelValue: string;
  panelType: CodegenFramework;
  prettierOpts: Record<string, unknown>;
  type: 'page';
}

export interface ICodeGeneratorParams {
  pageInfo: {
    /** 运行时常与 schema-card 的 content 一致，可能为流式 JSON 字符串 */
    schema: CardSchema | string;
    name?: string;
  };
  componentsMap?: IComponentMapItem[];
  // 是否在最终阶段使用 Prettier 格式化（浏览器端动态加载）。默认 false。
  formatWithPrettier?: boolean;
}

// 生成 `<script setup>` 正文时，各块共享的输入（便于扩展块读取同一份上下文）。
export interface IScriptSetupBuildContext {
  // 原始页面 schema。
  schema: CardSchema;
  // 原始组件映射，供 import 生成逻辑使用。
  componentsMap: IComponentMapItem[];
  description: ICodegenDescription;
}

// script setup 块：同 `group` 内多块按 `\n` 拼接，不同 group 之间按 `\n\n` 拼接。
export interface IScriptSetupSectionDefinition {
  id: string;
  group: string;
  build: (ctx: IScriptSetupBuildContext) => string;
}

export type CodegenFramework = 'vue' | 'react' | 'angular' | (string & {});

// 统一生成器接口：不同框架共享同一调用形态。
export interface IFrameworkCodeGenerator<TParams, TResult> {
  generate(params: TParams): Promise<TResult>;
}

// Vue 出码器配置（Prettier、编译校验等）。
export interface IVueCodeGeneratorOptions {
  // Prettier 配置，未传则使用内置默认。
  prettierOpts?: Record<string, unknown>;
  // 生成后是否用 @vue/compiler-sfc 做编译校验。默认 true；设为 false 可关闭（如减轻浏览器端开销）。
  enableCompileValidation?: boolean;
}
