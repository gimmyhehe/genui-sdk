import type { CardSchema } from '@opentiny/genui-sdk-core';

export interface IComponentMapItem {
  componentName: string;
  package: string;
  exportName?: string;
}

export interface ICodegenDescription {
  componentSet: Set<string>;
  iconComponents: { componentNames: string[]; exportNames: string[] };
  stateAccessor: string[];
  internalTypes: Set<string>;
  jsResource: Record<string, boolean>;
  hasJSX?: boolean;
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
    schema: CardSchema;
    name?: string;
  };
  componentsMap?: IComponentMapItem[];
  /** 是否在最终阶段使用 Prettier 格式化（浏览器端动态加载）。默认 false。 */
  formatWithPrettier?: boolean;
}

/** 生成 `<script setup>` 正文时，各块共享的输入（便于扩展块读取同一份上下文）。 */
export interface  IScriptSetupBuildContext {
  /** 原始页面 schema。 */
  schema: CardSchema;
  /** 原始组件映射，供 import 生成逻辑使用。 */
  componentsMap: IComponentMapItem[];
  description: ICodegenDescription;
}

/**
 * script setup 扩展块：同 `group` 内多块按 `\\n` 拼接，不同 group 之间按 `\\n\\n` 拼接。
 * 新增能力时向数组追加或替换同名 `id` 的块即可（也可通过 `VueCodeGenerator` 注入整表）。
 */
export interface IScriptSetupSectionDefinition {
  id: string;
  group: string;
  build: (ctx: IScriptSetupBuildContext) => string;
}

export type SectionInsertPosition = 'before' | 'after' | 'replace';

/** script setup 扩展声明：支持 before/after/replace 三种策略。 */
export interface IScriptSetupSectionExtension {
  section: IScriptSetupSectionDefinition;
  position: SectionInsertPosition;
  /** before/after 需要锚点；replace 可省略（默认替换同 id）。 */
  targetId?: string;
}

export type CodegenFramework = 'vue' | 'react' | 'angular' | (string & {});

export interface ICodegenFileArtifact {
  fileName: string;
  fileType: string;
  content: string;
}

export interface ICodegenDiagnostic {
  level: 'error' | 'warn' | 'info';
  message: string;
}

export interface ICodegenResult<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  framework: CodegenFramework;
  files: ICodegenFileArtifact[];
  diagnostics: ICodegenDiagnostic[];
  meta?: TMeta;
}

/** 统一生成器接口：不同框架共享同一调用形态。 */
export interface IFrameworkCodeGenerator<TParams, TResult = ICodegenResult> {
  generate(params: TParams): Promise<TResult>;
}

/** Vue 出码器块扩展配置。 */
export interface IVueCodeGeneratorSectionOptions {
  scriptSetupSections?: readonly IScriptSetupSectionDefinition[];
  scriptSetupSectionExtensions?: readonly IScriptSetupSectionExtension[];
}

