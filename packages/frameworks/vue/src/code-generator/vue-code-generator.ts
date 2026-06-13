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
   * 生成 script setup 的 state accessor（computed）片段。
   * @param ctx script setup 构建上下文
   * @returns computed 声明代码片段
   */
  protected buildScriptSetupStateAccessors(ctx: IScriptSetupBuildContext): string {
    return ctx.description.stateAccessors
      .map(({ name, getterExpr, setterExpr }) => {
        if (setterExpr) {
          return `const ${name} = computed({ get: ${getterExpr}, set: ${setterExpr} })`;
        }
        return `const ${name} = computed(${getterExpr})`;
      })
      .join('\n\n');
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
   * 返回 script setup 块表。
   * @returns script setup 块表
   */
  protected getScriptSetupSections(): readonly IScriptSetupSectionDefinition[] {
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
        id: 'stateAccessors',
        group: 'state',
        build: (ctx) => this.buildScriptSetupStateAccessors(ctx),
      },
      {
        id: 'methods',
        group: 'methods',
        build: (ctx) => this.buildScriptSetupMethods(ctx),
      },
    ];
  }

  /**
   * 创建 codegen 收集器（模板生成阶段写入，script 生成阶段读取）。
   * @returns codegen 收集器
   */
  protected createCodegenMeta(): ICodegenDescription {
    return {
      componentSet: new Set(),
      iconComponents: { componentNames: [], exportNames: [] },
      internalTypes: new Set(),
      stateAccessors: [],
    };
  }

  /**
   * 解析 props 值类型，与 `transformStateType` 白名单对齐：仅内置协议 type 才视为协议值，
   * 普通对象字面量中的 `type` 字段（如按钮 `type: 'primary'`）仍视为字面量。
   * @param value 属性值
   * @returns 协议类型名或 'literal'
   */
  protected resolvePropValueType(value: unknown): string {
    const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT];
    if (value && typeof value === 'object' && 'type' in value) {
      const protocolType = (value as { type?: string }).type;
      if (typeof protocolType === 'string' && builtInTypes.includes(protocolType)) {
        return protocolType;
      }
    }
    return 'literal';
  }

  /**
   * 将 JSFunction 协议值转换为可嵌入 Vue 模板的函数表达式。
   * @param value 函数字符串
   * @returns 箭头函数表达式
   */
  protected buildJSFunctionExpression(value: string): string {
    const info = this.getFunctionInfo(value);
    if (!info) {
      return this.replaceThis(value);
    }
    const asyncPrefix = info.type ? `${info.type} ` : '';
    return `${asyncPrefix}(${info.params.join(',')}) => { ${info.body.replace(/this\.(props\.)?/g, '')} }`;
  }

  /**
   * 将 prop 协议值提升到 schema.state，模板侧只绑定 `state.xxx`。
   *
   * 普通 prop 上的 JSFunction 不内联进模板，原因：
   * 1. 常嵌套在对象/数组中（如 columnsConfig.formatter），JSON 字面量无法表达函数，只能整包 hoist；
   * 2. 函数体经 traverseState → transformStateType 在 script 的 reactive(...) 里还原为真实函数（#QUOTES_START# 占位）；
   * 3. 模板属性引号与多行函数体易冲突，出码 fragile；
   * 4. 顶层与嵌套 JSFunction 共用同一路径，避免形态不同却出码不一致。
   *
   * 为何写入 state 而非 methods：
   * - schema 语义不同：methods 是页面级可复用动作（this.hello()）；prop 上的 JSFunction 是传给子组件的配置/回调（rowKey、formatter），属于 prop 值；
   * - 需保持 prop 结构：嵌套对象须整包保留（:columnsConfig="state.columnsConfig"），methods 是扁平 Record，无法承载嵌套形态；
   * - 复用现有管线：traverseState 已递归处理 state 内的 JSFunction/JSResource/JSSlot；methods 仅 replaceThis 直出函数字符串，无协议 transform；
   * - 与运行时一致：RenderMain 中 props 回调走 parseData 进 state/属性值，methods 单独挂载到 context。
   *
   * 对比：onXxx 事件上的 JSFunction 由 handleEventBinding 内联为 @click="..."，因绑定点单一且体量通常较短。
   *
   * @param key 属性名
   * @param item 属性值（协议对象或含协议类型的嵌套结构）
   * @param attrsArr 属性语句数组
   * @param state 根 state 对象（出码过程中临时写入，最终进入 reactive）
   */
  protected hoistPropToState(key: string, item: unknown, attrsArr: string[], state: Record<string, unknown>): void {
    const valueKey = this.avoidDuplicateString(Object.keys(state), key);
    state[valueKey] = item;
    attrsArr.push(`:${key}="state.${valueKey}"`);
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
   * 用于 componentName 为 Template（渲染为 `<template>`）的节点，声明 #slotName 插槽内容。
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
   * 事件上的 JSFunction 可内联：绑定点单一（@click），handler 通常较短，buildJSFunctionExpression 即可安全出码。
   * 普通 prop 上的 JSFunction 见 hoistPropToState。
   * @param key 事件键名
   * @param item 事件配置
   * @returns 事件绑定语法
   */
  protected handleEventBinding(key: string, item: { type?: string; value?: string; params?: string[] }): string {
    const eventKey = toEventKey(key);

    if (item?.type === JS_FUNCTION) {
      const handler = this.buildJSFunctionExpression(item.value ?? '');
      if (item.params?.length) {
        return `@${eventKey}="(...eventArgs) => (${handler})(...eventArgs, ${item.params.join(',')})"`;
      }
      return `@${eventKey}="${handler}"`;
    }

    if (item?.type !== JS_EXPRESSION) {
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
      // 嵌套 JSFunction/JSResource/JSSlot 无法 JSON 内联，整包 hoist（同顶层 JSFunction prop，见 hoistPropToState）
      const requiresStateHoist =
        localInternalTypes.has('JSFunction') ||
        localInternalTypes.has('JSResource') ||
        localInternalTypes.has('JSSlot');

      if (requiresStateHoist) {
        description.internalTypes = prevInternalTypes;
        this.hoistPropToState(key, item, attrsArr, state);
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
      const propType = this.resolvePropValueType(rawItem);

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

      if (propType === JS_FUNCTION) {
        // 普通 prop：不内联函数体，提升到 state 后由 transformStateType 在 reactive 中还原
        this.hoistPropToState(key, rawItem, attrsArr, state);
        return;
      }

      if (propType === JS_EXPRESSION) {
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
    const stateEntry = current[prop];
    if (stateEntry?.accessor) {
      const getterValue = stateEntry.accessor.getter?.value ?? 'function() {}';
      const setterValue = stateEntry.accessor.setter?.value;
      const getterInfo = this.getFunctionInfo(getterValue);
      const setterInfo = setterValue ? this.getFunctionInfo(setterValue) : null;

      description.stateAccessors.push({
        name: prop,
        getterExpr: getterInfo
          ? `() => { ${getterInfo.body.replace(/this\.(props\.)?/g, '')} }`
          : `() => (${this.replaceThis(getterValue)})()`,
        setterExpr: setterInfo
          ? `(${setterInfo.params.join(',')}) => { ${setterInfo.body.replace(/this\.(props\.)?/g, '')} }`
          : undefined,
      });

      if (stateEntry.defaultValue !== undefined) {
        current[prop] = stateEntry.defaultValue;
      } else {
        delete current[prop];
      }
      return;
    }

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
      current[prop] = `${start}${value.replace(/this\./g, '')}${end}`;
      return;
    }

    const { value = [], params = ['row'] } = current[prop] || {};
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
    const codegenMeta = this.createCodegenMeta();
    const scriptSetupCtx: IScriptSetupBuildContext = { schema, componentsMap, description: codegenMeta };
    const rootState = schema.state as Record<string, any>;
    const template = this.generateTemplate(schema, rootState, codegenMeta);
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

      return await format(source, {
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
