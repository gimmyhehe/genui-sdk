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

  protected replaceThis(value: string): string {
    return value.replace(/this\./g, '');
  }

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

  protected buildScriptSetupDefineEmits(ctx: IScriptSetupBuildContext): string {
    const { schema: innerSchema } = ctx.schema;
    if (!innerSchema) {
      return '';
    }
    const { events = {} } = innerSchema;
    const emitsArr = Object.keys(events).map(toEventKey);
    return emitsArr.length ? `const emit = defineEmits(${JSON.stringify(emitsArr)})` : '';
  }

  protected buildScriptSetupIconStatement(ctx: IScriptSetupBuildContext): string {
    const { componentNames, exportNames } = ctx.description.iconComponents;
    return componentNames.length
      ? `const [${componentNames.join(',')}] = [${exportNames.map((name) => `${name}()`).join(',')}]`
      : '';
  }

  protected buildScriptSetupReactiveState(ctx: IScriptSetupBuildContext): string {
    const { state = {} } = ctx.schema as CardSchema & { state?: Record<string, unknown> };
    this.traverseState(state as Record<string, any>, ctx.description);
    return `const state = reactive(${unwrapExpression(JSON.stringify(state, null, 2))})`;
  }

  protected buildScriptSetupMethods(ctx: IScriptSetupBuildContext): string {
    const { methods = {} } = ctx.schema as CardSchema & { methods?: Record<string, { value: string }> };
    const methodLines = Object.entries(methods).map(([key, item]) => `const ${key} = ${this.replaceThis(item.value)}`);
    return methodLines.join('\n\n');
  }

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

  protected buildSfcTemplateSection(template: string): string {
    return `<template>
  ${template}
</template>`;
  }

  protected buildSfcScriptSetupSection(scriptSetup: string): string {
    return `<script setup>
${scriptSetup}
</script>`;
  }

  protected buildSfcStyleSection(style: string): string {
    return `<style scoped>
  ${style}
</style>`;
  }

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

  protected createCodegenMeta(): ICodegenDescription {
    return {
      componentSet: new Set(),
      iconComponents: { componentNames: [], exportNames: [] },
      internalTypes: new Set(),
      stateAccessors: [],
    };
  }

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

  protected buildJSFunctionExpression(value: string): string {
    const info = this.getFunctionInfo(value);
    if (!info) {
      return this.replaceThis(value);
    }
    const asyncPrefix = info.type ? `${info.type} ` : '';
    return `${asyncPrefix}(${info.params.join(',')}) => { ${info.body.replace(/this\.(props\.)?/g, '')} }`;
  }

  protected hoistPropToState(key: string, item: unknown, attrsArr: string[], state: Record<string, unknown>): void {
    const valueKey = this.avoidDuplicateString(Object.keys(state), key);
    state[valueKey] = item;
    attrsArr.push(`:${key}="state.${valueKey}"`);
  }

  protected isOnEventKey(key: string): boolean {
    return /^on([A-Z]\w*)/.test(key);
  }

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

  protected avoidDuplicateString(existings: string[], baseName: string): string {
    let result = baseName;
    let suffix = 1;
    while (existings.includes(result)) {
      result = `${baseName}${suffix}`;
      suffix++;
    }
    return result;
  }

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

  protected isEmptySlotNode(componentName: string | undefined, children: unknown): boolean {
    return (
      componentName === 'template' &&
      !(children as { length?: number; type?: string })?.length &&
      !(children as { length?: number; type?: string })?.type
    );
  }

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

  protected normalizeComponentsMap(componentsMap: IComponentMapItem[] | undefined): IComponentMapItem[] {
    const validComponents = (componentsMap ?? []).filter(({ componentName, package: pkg }) => componentName && pkg);
    const allComponentsMap = new Map<string, IComponentMapItem>();
    validComponents.forEach(
      (item) => !allComponentsMap.has(item.componentName) && allComponentsMap.set(item.componentName, item),
    );
    return [...allComponentsMap.values()];
  }

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
