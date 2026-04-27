import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import { JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT, UNWRAP_QUOTES } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  IComponentMapItem,
  ICodePanel,
  IScriptSetupBuildContext,
  IScriptSetupSectionDefinition,
  IFrameworkCodeGenerator,
  IVueCodeGeneratorOptions,
} from './types';
import { capitalize, hyphenate, toEventKey, unwrapExpression } from './utils';
import { validateByCompile } from './vue-sfc-validator';

export type ICodeGeneratorResult = ICodePanel & { errors: { message: string }[] };

const DEFAULT_PRETTIER_OPTS: Record<string, unknown> = {
  semi: false,
  singleQuote: true,
  printWidth: 120,
  trailingComma: 'none',
  endOfLine: 'auto',
  tabWidth: 2,
  parser: 'vue',
  htmlWhitespaceSensitivity: 'ignore',
};

export class VueCodeGenerator implements IFrameworkCodeGenerator<ICodeGeneratorParams, ICodeGeneratorResult> {
  private readonly prettierOpts: Record<string, unknown>;
  private readonly enableCompileValidation: boolean;

  constructor(private readonly generatorOptions: IVueCodeGeneratorOptions = {}) {
    this.prettierOpts = {
      ...DEFAULT_PRETTIER_OPTS,
      ...(generatorOptions.prettierOpts ?? {}),
    };
    this.enableCompileValidation = generatorOptions.enableCompileValidation !== false;
  }

  /**
   * 移除表达式中的 `this.` 前缀。
   * @param value 原始表达式
   * @returns 移除前缀后的表达式
   */
  protected replaceThis(value: string): string {
    return value.replace(/this\./g, '');
  }

  /**
   * 按扩展配置合并 section 列表。
   * @param baseSections 基础块列表
   * @param extensions 扩展声明列表
   * @returns 合并后的块列表
   */
  protected composeSections<T extends { id: string }>(
    baseSections: readonly T[],
    extensions: readonly { section: T; position: 'before' | 'after' | 'replace'; targetId?: string }[] = [],
  ): T[] {
    const result = [...baseSections];

    extensions.forEach((ext) => {
      const { section, position } = ext;
      const targetId = ext.targetId ?? section.id;
      const targetIndex = result.findIndex((item) => item.id === targetId);

      if (position === 'replace') {
        if (targetIndex >= 0) {
          result[targetIndex] = section;
        } else {
          result.push(section);
        }
        return;
      }

      if (targetIndex < 0) {
        result.push(section);
        return;
      }

      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
      result.splice(insertIndex, 0, section);
    });

    return result;
  }

  /**
   * 生成 script setup 的 import 片段。
   * @param ctx script setup 构建上下文
   * @returns import 代码片段
   */
  protected buildScriptSetupImports(ctx: IScriptSetupBuildContext): string {
    const { componentSet } = ctx.description;
    const importLines: string[] = ['import { reactive, computed } from "vue"'];
    const componentsInSFC = [...componentSet];
    const componentDeps = ctx.componentsMap.filter((item) => componentsInSFC.includes(item.componentName));
    const componentPacks: Record<string, IComponentMapItem[]> = {};

    componentDeps.forEach((item) => {
      const { package: pkg } = item;
      if (!componentPacks[pkg]) {
        componentPacks[pkg] = [];
      }
      componentPacks[pkg].push(item);
    });

    Object.entries(componentPacks).forEach(([pkgName, deps]) => {
      const items = deps.map((dep) => {
        const { componentName, exportName } = dep;
        return exportName && exportName !== componentName ? `${exportName} as ${componentName}` : `${componentName}`;
      });
      importLines.push(`import { ${items.join(',')} } from '${pkgName}'`);
    });

    return importLines.join('\n');
  }

  /**
   * 生成 script setup 的 defineProps 片段。
   * @param ctx script setup 构建上下文
   * @returns defineProps 代码片段
   */
  protected buildScriptSetupDefineProps(ctx: IScriptSetupBuildContext): string {
    const { schema: innerSchema } = ctx.schema;
    if (!innerSchema) {
      return '';
    }
    const { properties = [] } = innerSchema;
    const propsArr: string[] = [];
    properties.forEach(({ content = [] }) => {
      content.forEach(({ property, type, defaultValue }) => {
        const propType = capitalize(type);
        let propValue: unknown = defaultValue;

        if (propType === 'String') {
          propValue = JSON.stringify(defaultValue);
        } else if (['Array', 'Object'].includes(propType)) {
          propValue = `() => (${JSON.stringify(defaultValue)})`;
        } else if (propType === 'Function') {
          propValue = (defaultValue as { value?: string } | undefined)?.value ?? 'undefined';
        }

        propsArr.push(`${property}: { type: ${propType}, default: ${propValue} }`);
      });
    });

    return propsArr.length ? `const props = defineProps({${propsArr.join(',\n')}})` : '';
  }

  /**
   * 生成 script setup 的 defineEmits 片段。
   * @param ctx script setup 构建上下文
   * @returns defineEmits 代码片段
   */
  protected buildScriptSetupDefineEmits(ctx: IScriptSetupBuildContext): string {
    const { schema: innerSchema } = ctx.schema;
    if (!innerSchema) {
      return '';
    }
    const { events = {} } = innerSchema;
    const emitsArr = Object.keys(events).map(toEventKey);
    return emitsArr.length ? `const emit = defineEmits(${JSON.stringify(emitsArr)})` : '';
  }

  /**
   * 生成图标组件初始化片段。
   * @param ctx script setup 构建上下文
   * @returns 图标初始化代码片段
   */
  protected buildScriptSetupIconStatement(ctx: IScriptSetupBuildContext): string {
    const { componentNames, exportNames } = ctx.description.iconComponents;
    return componentNames.length
      ? `const [${componentNames.join(',')}] = [${exportNames.map((name) => `${name}()`).join(',')}]`
      : '';
  }

  /**
   * 生成 reactive state 片段。
   * @param ctx script setup 构建上下文
   * @returns reactive state 代码片段
   */
  protected buildScriptSetupReactiveState(ctx: IScriptSetupBuildContext): string {
    const { state = {} } = ctx.schema as CardSchema & { state?: Record<string, unknown> };
    this.traverseState(state as Record<string, any>, ctx.description);
    return `const state = reactive(${unwrapExpression(JSON.stringify(state, null, 2))})`;
  }

  /**
   * 生成 methods 片段。
   * @param ctx script setup 构建上下文
   * @returns methods 代码片段
   */
  protected buildScriptSetupMethods(ctx: IScriptSetupBuildContext): string {
    const { methods = {} } = ctx.schema as CardSchema & { methods?: Record<string, { value: string }> };
    const methodLines = Object.entries(methods).map(([key, item]) => `const ${key} = ${this.replaceThis(item.value)}`);
    return methodLines.join('\n\n');
  }

  /**
   * 按块定义拼接 script setup 正文（不含 `<script setup>` 标签）。
   * 空块会在组内被省略，空组则整块省略。
   */
  protected buildScriptSetupBody(
    ctx: IScriptSetupBuildContext,
    sections: readonly IScriptSetupSectionDefinition[],
  ): string {
    const groupOrder: string[] = [];
    const byGroup = new Map<string, string[]>();

    for (const sec of sections) {
      if (!byGroup.has(sec.group)) {
        byGroup.set(sec.group, []);
        groupOrder.push(sec.group);
      }
      byGroup.get(sec.group)!.push(sec.build(ctx));
    }

    return groupOrder
      .map((g) => byGroup.get(g)!.filter(Boolean).join('\n'))
      .filter(Boolean)
      .join('\n\n');
  }

  /**
   * 返回默认 script setup 块表。
   * @returns 默认块表
   */
  protected getDefaultScriptSetupSections(): readonly IScriptSetupSectionDefinition[] {
    return [
      {
        id: 'imports',
        group: 'imports',
        build: (ctx) => this.buildScriptSetupImports(ctx),
      },
      {
        id: 'defineProps',
        group: 'macro',
        build: (ctx) => this.buildScriptSetupDefineProps(ctx),
      },
      {
        id: 'defineEmits',
        group: 'macro',
        build: (ctx) => this.buildScriptSetupDefineEmits(ctx),
      },
      {
        id: 'icons',
        group: 'icons',
        build: (ctx) => this.buildScriptSetupIconStatement(ctx),
      },
      {
        id: 'reactive',
        group: 'state',
        build: (ctx) => this.buildScriptSetupReactiveState(ctx),
      },
      {
        id: 'methods',
        group: 'methods',
        build: (ctx) => this.buildScriptSetupMethods(ctx),
      },
    ];
  }

  /**
   * 生成 SFC 的 template 区块。
   * @param template 模板文本
   * @returns template 区块文本
   */
  protected buildSfcTemplateSection(template: string): string {
    return `<template>
  ${template}
</template>`;
  }

  /**
   * 生成 SFC 的 script setup 区块。
   * @param scriptSetup script setup 文本
   * @returns script setup 区块文本
   */
  protected buildSfcScriptSetupSection(scriptSetup: string): string {
    return `<script setup>
${scriptSetup}
</script>`;
  }

  /**
   * 生成 SFC 的 style scoped 区块。
   * @param style 样式文本
   * @returns style 区块文本
   */
  protected buildSfcStyleSection(style: string): string {
    return `<style scoped>
  ${style}
</style>`;
  }

  /**
   * 获取 script setup 块表，并按扩展配置完成编排。
   * @returns script setup 块表
   */
  protected getScriptSetupSections(): readonly IScriptSetupSectionDefinition[] {
    const baseSections = this.generatorOptions.scriptSetupSections ?? this.getDefaultScriptSetupSections();
    return this.composeSections(baseSections, this.generatorOptions.scriptSetupSectionExtensions);
  }

  /**
   * 创建 codegen 描述对象。
   * @returns codegen 描述对象
   */
  protected createDescription(): ICodegenDescription {
    return {
      componentSet: new Set(),
      iconComponents: { componentNames: [], exportNames: [] },
      stateAccessor: [],
      internalTypes: new Set(),
      jsResource: { utils: false, bridge: false },
    };
  }

  /**
   * 判断属性名是否为事件名。
   * @param key 属性名
   * @returns 是否为事件属性
   */
  protected isOnEventKey(key: string): boolean {
    return /^on([A-Z]\w*)/.test(key);
  }

  /**
   * 处理 slot 协议并生成 Vue 插槽绑定语法。
   * @param item slot 配置
   * @returns 插槽绑定语法
   */
  protected handleSlotBinding(item: Record<string, unknown> | string): string {
    const { name, params } = (item as { name?: string; params?: string[] | string }) ?? {};
    let slot = `#${name || item}`;
    if (Array.isArray(params)) {
      slot = `#${name}="{ ${params.join(',')} }"`;
    } else if (typeof params === 'string') {
      slot = `#${name}="${params}"`;
    }
    return slot;
  }

  /**
   * 处理事件绑定并生成模板语法。
   * @param key 事件键名
   * @param item 事件配置
   * @returns 事件绑定语法
   */
  protected handleEventBinding(key: string, item: { type?: string; value?: string; params?: string[] }): string {
    const eventKey = toEventKey(key);
    if (item?.type !== 'JSExpression') {
      return '';
    }
    const eventHandler = (item.value ?? '').replace(/this\.(props\.)?/g, '');
    if (item.params?.length) {
      const extendParams = item.params.join(',');
      return `@${eventKey}="(...eventArgs) => ${eventHandler}(eventArgs, ${extendParams})"`;
    }
    return `@${eventKey}="${eventHandler}"`;
  }

  /**
   * 生成不重复的变量名。
   * @param existings 已存在变量名列表
   * @param baseName 基础变量名
   * @returns 不重复变量名
   */
  protected avoidDuplicateString(existings: string[], baseName: string): string {
    let result = baseName;
    let suffix = 1;
    while (existings.includes(result)) {
      result = `${baseName}${suffix}`;
      suffix++;
    }
    return result;
  }

  /**
   * 处理字面量属性并追加绑定语法。
   * @param key 属性名
   * @param item 属性值
   * @param attrsArr 属性语句数组
   * @param description 生成描述
   * @param state 状态对象
   */
  protected handleLiteralBinding(
    key: string,
    item: unknown,
    attrsArr: string[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
  ): void {
    if (typeof item === 'string') {
      attrsArr.push(`${key}="${item.replace(/"/g, '&quot;')}"`);
      return;
    }

    if (item && typeof item === 'object') {
      const prevInternalTypes = description.internalTypes;
      const localInternalTypes = new Set(prevInternalTypes);
      description.internalTypes = localInternalTypes;

      this.traverseState(item as Record<string, unknown>, description);
      const cannotBind =
        localInternalTypes.has('JSFunction') ||
        localInternalTypes.has('JSResource') ||
        localInternalTypes.has('JSSlot');

      if (cannotBind) {
        description.internalTypes = prevInternalTypes;
        const valueKey = this.avoidDuplicateString(Object.keys(state), key);
        state[valueKey] = item;
        attrsArr.push(`:${key}="state.${valueKey}"`);
        return;
      }

      description.internalTypes = prevInternalTypes;
      const parsedValue = unwrapExpression(JSON.stringify(item)).replace(/props\./g, '');
      const safeExpr = parsedValue.replace(/'/g, '&#39;');
      attrsArr.push(`:${key}='${safeExpr}'`);
      return;
    }

    attrsArr.push(`:${key}="${item}"`);
  }

  /**
   * 处理 props 并生成模板属性绑定。
   * @param props 节点属性
   * @param attrsArr 属性语句数组
   * @param description 生成描述
   * @param state 状态对象
   */
  protected handleBinding(
    props: Record<string, unknown>,
    attrsArr: string[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
  ): void {
    Object.entries(props).forEach(([rawKey, rawItem]) => {
      let key = rawKey === 'className' ? 'class' : rawKey;

      if (key === 'slot') {
        attrsArr.push(this.handleSlotBinding(rawItem as Record<string, unknown> | string));
        return;
      }

      const item = rawItem as { type?: string; value?: string; model?: { prop?: string }; params?: string[] };
      const propType = item?.type || 'literal';

      if (this.isOnEventKey(key)) {
        const eventBinding = this.handleEventBinding(key, item);
        if (eventBinding) {
          attrsArr.push(eventBinding);
        }
        return;
      }

      if (propType === 'literal') {
        this.handleLiteralBinding(key, rawItem, attrsArr, description, state);
        return;
      }

      if (propType === 'JSExpression') {
        if (item.model) {
          const modelArgs = item.model?.prop ? `:${item.model.prop}` : '';
          attrsArr.push(`v-model${modelArgs}="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
          return;
        }
        attrsArr.push(`:${key}="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
      }
    });
  }

  /**
   * 递归处理子节点并拼接模板片段。
   * @param children 子节点
   * @param state 状态对象
   * @param description 生成描述
   * @param result 模板片段数组
   */
  protected recurseChildren(
    children: NodeSchema[] | NodeSchema | string | undefined,
    state: Record<string, unknown>,
    description: ICodegenDescription,
    result: string[],
  ): void {
    if (Array.isArray(children)) {
      result.push(
        children.map((child) => this.generateTemplate(child as CardSchema, state, description, false)).join(''),
      );
      return;
    }
    result.push((children as string) || '');
  }

  /**
   * 判断是否为空 template 插槽节点。
   * @param componentName 组件名
   * @param children 子节点
   * @returns 是否为空插槽节点
   */
  protected isEmptySlotNode(componentName: string | undefined, children: unknown): boolean {
    return (
      componentName === 'template' &&
      !(children as { length?: number; type?: string })?.length &&
      !(children as { length?: number; type?: string })?.type
    );
  }

  /**
   * 根据 schema 生成模板文本。
   * @param schema 页面 schema
   * @param description 生成描述
   * @returns 模板文本
   */
  protected generateTemplate(
    schema: CardSchema,
    state: Record<string, any>,
    description: ICodegenDescription,
    isRootNode = true,
  ): string {
    const result: string[] = [];
    const { componentName, loop, loopArgs = ['item'], condition, props = {}, children } = schema;

    if (this.isEmptySlotNode(componentName, children)) {
      return '';
    }

    const component = isRootNode ? 'div' : hyphenate(componentName || 'div');
    if (!isRootNode && componentName) {
      description.componentSet.add(componentName);
    }

    result.push(`\n<${component} `);
    const attrsArr: string[] = [];

    if (loop) {
      const loopData = (loop as { type?: string; value?: string }).type
        ? ((loop as { value?: string }).value ?? '').replace(/this\.(props\.)?/g, '')
        : JSON.stringify(loop).replace(/"/g, '&quot;');
      attrsArr.push(`v-for="(${loopArgs.join(',')}) in ${loopData}"`);
    }

    if (typeof condition === 'object' || typeof condition === 'boolean') {
      const isObjectCondition = typeof condition === 'object' && condition !== null;
      const conditionObj = condition as { type?: string; value?: string; kind?: string };
      const conditionValue =
        isObjectCondition && conditionObj.type
          ? (conditionObj.value ?? '').replace(/this\.(props\.)?/g, '')
          : condition;
      const directive = isObjectCondition ? conditionObj.kind || 'if' : 'if';
      attrsArr.push(directive === 'else' ? 'v-else' : `v-${directive}="${conditionValue}"`);
    }

    this.handleBinding(props as Record<string, unknown>, attrsArr, description, state);
    result.push(attrsArr.join(' '));

    const VOID_ELEMENTS = ['img', 'input', 'br', 'hr', 'link'];
    if (VOID_ELEMENTS.includes(component)) {
      result.push(' />');
    } else {
      result.push('>');
      this.recurseChildren(children as NodeSchema[] | NodeSchema | string | undefined, state, description, result);
      result.push(`</${component}>`);
    }

    return result.join('');
  }

  /**
   * 根据 schema 生成 JSX 模板文本。
   * @param item 节点 schema
   * @param description 生成描述
   * @param state 状态对象
   * @returns JSX 模板文本
   */
  protected generateSlotTemplate(
    item: Record<string, any>,
    description: ICodegenDescription,
    state: Record<string, unknown> = {},
  ): string {
    const result: string[] = [];
    const { componentName, component: componentAlias, props = {}, children, condition } = item;
    const component = componentName || componentAlias || 'div';
    description.componentSet.add(component);
    const attrsArr: string[] = [];

    if (condition) {
      const conditionValue = condition?.type ? condition.value.replace(/this\./g, '') : condition;
      result.push(`{ ${conditionValue} && `);
    }

    result.push(`<${component} `);
    this.handleBinding(props, attrsArr, description, state);
    result.push(attrsArr.join(' '));

    const VOID_ELEMENTS = ['img', 'input', 'br', 'hr', 'link'];
    if (VOID_ELEMENTS.includes(component)) {
      result.push(' />');
    } else {
      result.push('>');
      if (Array.isArray(children)) {
        result.push(children.map((child) => this.generateSlotTemplate(child, description, state)).join(''));
      } else if (children?.type === 'JSExpression') {
        result.push(`{ ${children.value.replace(/this\./g, '')} }`);
      } else if (children?.type === 'i18n') {
        result.push(`{t('${children.key}')}`);
      } else {
        result.push(children || '');
      }
      result.push(`</${component}>`);
    }

    if (condition) {
      result.push(' }');
    }

    return result.join('');
  }

  /**
   * 解析函数字符串。
   * @param fnStr 函数字符串
   * @returns 函数信息
   */
  protected getFunctionInfo(fnStr: string): { type: string; params: string[]; body: string } | null {
    const fnRegexp = /(async)?.*?(\w+) *\(([\s\S]*?)\) *\{([\s\S]*)\}/;
    const result = fnRegexp.exec(fnStr);
    if (!result) {
      return null;
    }
    return {
      type: result[1] || '',
      params: result[3]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      body: result[4],
    };
  }

  /**
   * 转换 state 中的内置协议类型。
   * @param current 当前对象
   * @param prop 当前属性
   * @param description 生成描述
   * @param rootState 根状态
   */
  protected transformStateType(
    current: Record<string, any>,
    prop: string,
    description: ICodegenDescription,
    rootState: Record<string, any>,
  ): void {
    const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT];
    const { type } = current[prop] || {};
    if (!builtInTypes.includes(type)) {
      return;
    }

    description.internalTypes.add(type);
    const { start, end } = UNWRAP_QUOTES;

    if (type === JS_EXPRESSION) {
      const { value = '', computed = false } = current[prop] || {};
      current[prop] = computed
        ? `${start}computed(${value.replace(/this\./g, '')})${end}`
        : `${start}${value.replace(/this\./g, '')}${end}`;
      return;
    }

    if (type === JS_FUNCTION) {
      const { value = '' } = current[prop] || {};
      const info = this.getFunctionInfo(value);
      if (!info) {
        current[prop] = `${start}${typeof value === 'string' ? value.replace(/this\./g, '') : ''}${end}`;
        return;
      }
      const inlineFunc = `${info.type} (${info.params.join(',')}) => { ${info.body.replace(/this\./g, '')} }`;
      current[prop] = `${start}${inlineFunc}${end}`;
      return;
    }

    if (type === JS_I18N) {
      const { key = '' } = current[prop] || {};
      current[prop] = `${start}t("${key}")${end}`;
      return;
    }

    if (type === JS_RESOURCE) {
      const { value = '' } = current[prop] || {};
      const resourceType = value.split('.')[1];
      if (Object.prototype.hasOwnProperty.call(description.jsResource, resourceType)) {
        description.jsResource[resourceType] = true;
      }
      current[prop] = `${start}${value.replace(/this\./g, '')}${end}`;
      return;
    }

    const { value = [], params = ['row'] } = current[prop] || {};
    description.hasJSX = true;
    const slotValues = (value as any[]).map((item) => this.generateSlotTemplate(item, description, rootState)).join('');
    current[prop] = `${start}({ ${params.join(',')} }, h) => ${slotValues}${end}`;
  }

  /**
   * 深度遍历并处理 state 中的内置类型。
   * @param state 页面状态
   * @param description 生成描述
   */
  protected traverseState(
    state: Record<string, any>,
    description: ICodegenDescription,
    rootState: Record<string, any> = state,
  ): void {
    if (typeof state !== 'object' || state === null) {
      return;
    }
    if (Array.isArray(state)) {
      state.forEach((item) => this.traverseState(item, description, rootState));
      return;
    }
    Object.keys(state).forEach((prop) => {
      if (Object.prototype.hasOwnProperty.call(state, prop)) {
        this.transformStateType(state, prop, description, rootState);
        this.traverseState(state[prop], description, rootState);
      }
    });
  }

  /**
   * 将页面 schema 转换为单文件组件源码。
   * @param schema 页面 schema
   * @param componentsMap 组件映射
   * @returns 单文件组件源码
   */
  protected buildVueSfcSource({
    schema,
    componentsMap,
  }: {
    schema: CardSchema;
    name?: string;
    componentsMap: IComponentMapItem[];
  }): string {
    const description = this.createDescription();
    const scriptSetupCtx: IScriptSetupBuildContext = { schema, componentsMap, description };
    const rootState = schema.state as Record<string, any>;
    const template = this.generateTemplate(schema, rootState, description);
    const script = this.buildScriptSetupBody(scriptSetupCtx, this.getScriptSetupSections());

    return [
      this.buildSfcTemplateSection(template),
      this.buildSfcScriptSetupSection(script),
      this.buildSfcStyleSection(schema.css || ''),
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  /**
   * 生成页面级代码面板信息
   * @param pageInfo 页面信息
   * @param componentsMap 组件映射
   * @param formatWithPrettier 是否使用 Prettier 格式化
   * @returns 页面级代码面板信息
   */
  /**
   * 将 pageInfo.schema 规范为对象。流式场景下 content 常为 JSON 字符串，若不解构前解析会得到空 state/空模板。
   */
  protected normalizeIncomingSchema(origin: CardSchema | string | null | undefined): CardSchema {
    if (origin == null) {
      return { componentName: 'Page', children: [] } as CardSchema;
    }
    if (typeof origin === 'string') {
      const trimmed = origin.trim();
      if (!trimmed) {
        return { componentName: 'Page', children: [] } as CardSchema;
      }
      try {
        return JSON.parse(trimmed) as CardSchema;
      } catch {
        return { componentName: 'Page', children: [] } as CardSchema;
      }
    }
    return origin as CardSchema;
  }

  protected async generatePageCode({
    pageInfo,
    componentsMap,
    formatWithPrettier = false,
  }: {
    pageInfo: ICodeGeneratorParams['pageInfo'];
    componentsMap: IComponentMapItem[];
    formatWithPrettier?: boolean;
  }): Promise<ICodeGeneratorResult> {
    const { schema: originSchema, name = 'SchemaCard' } = pageInfo;

    const schema = JSON.parse(JSON.stringify(this.normalizeIncomingSchema(originSchema))) as CardSchema;
    const vueCode = this.buildVueSfcSource({ schema, name, componentsMap });
    const panelName = `${name}.vue`;
    const compileErrors = this.enableCompileValidation ? validateByCompile(panelName, vueCode) : [];
    const type = 'page';
    const panelValue = vueCode;

    const panel: ICodePanel = {
      panelName,
      panelValue,
      panelType: 'vue',
      prettierOpts: { ...this.prettierOpts },
      type,
    };
    const result: ICodeGeneratorResult = { ...panel, errors: compileErrors };
    if (formatWithPrettier) {
      result.panelValue = await this.formatWithPrettier(result.panelValue, result.prettierOpts);
    }
    return result;
  }

  /**
   * 规范化组件映射：去空包名、按键去重。
   * @param componentsMap 组件映射
   * @returns 规范化后的组件映射
   */
  protected normalizeComponentsMap(componentsMap: IComponentMapItem[] | undefined): IComponentMapItem[] {
    const validComponents = (componentsMap ?? []).filter(({ componentName, package: pkg }) => componentName && pkg);
    const allComponentsMap = new Map<string, IComponentMapItem>();
    validComponents.forEach(
      (item) => !allComponentsMap.has(item.componentName) && allComponentsMap.set(item.componentName, item),
    );
    return [...allComponentsMap.values()];
  }

  /**
   * 使用 Prettier 格式化代码。
   * @param source 待格式化代码
   * @param prettierOpts Prettier 配置
   * @returns 格式化后的代码
   */
  protected async formatWithPrettier(source: string, prettierOpts: Record<string, unknown>): Promise<string> {
    try {
      const [{ format }, { default: htmlPlugin }, { default: babelPlugin }, { default: estreePlugin }] =
        await Promise.all([
          import('prettier/standalone'),
          import('prettier/plugins/html'),
          import('prettier/plugins/babel'),
          import('prettier/plugins/estree'),
        ]);

      return format(source, {
        ...prettierOpts,
        plugins: [htmlPlugin, babelPlugin, estreePlugin],
      });
    } catch {
      return source;
    }
  }

  /**
   * 生成代码；可选 Prettier（浏览器端动态加载）。
   * @param params 代码生成参数
   * @returns 代码生成结果
   */
  async generate({
    pageInfo,
    componentsMap = [],
    formatWithPrettier = false,
  }: ICodeGeneratorParams): Promise<ICodeGeneratorResult> {
    const normalizedComponentsMap = this.normalizeComponentsMap(componentsMap);
    return this.generatePageCode({
      pageInfo,
      componentsMap: normalizedComponentsMap,
      formatWithPrettier,
    });
  }
}

export const generateCode = (params: ICodeGeneratorParams): Promise<ICodeGeneratorResult> =>
  new VueCodeGenerator().generate(params);
