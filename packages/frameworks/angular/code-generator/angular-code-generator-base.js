import { JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT, UNWRAP_QUOTES } from './constants';
import { capitalize, hyphenate, toEventKey, unwrapExpression } from './utils';
import { CodeGeneratorBase } from './code-generator-base';
export class AngularCodeGeneratorBase extends CodeGeneratorBase {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    templateActionNames = new Set();
    templateGeneratedMethods = [];
    templateMethodCounter = 0;
    get voidElements() {
        return ['img', 'input', 'br', 'hr', 'link', ...(this.config.extraVoidElements ?? [])];
    }
    resolveComponentTag(componentName) {
        return this.config.componentSelector[componentName] || hyphenate(componentName);
    }
    resolveExtraDirective(componentName) {
        return this.config.componentExtraSelector?.[componentName];
    }
    processLibrarySpecificProp(_componentName, _key, _rawItem, _props, _attrsArr, _description, _state, _actionNames, _schemaMethods) {
        return false;
    }
    processLibrarySpecificChildren(_componentName, _children) {
        return undefined;
    }
    buildImports(description, hasOutputs = false, hasLifecycle = false) {
        const { componentSet } = description;
        const componentsInUse = [...componentSet];
        const moduleNames = [];
        const seenModules = new Set();
        componentsInUse.forEach((compName) => {
            const moduleName = this.config.moduleRefMap[compName];
            if (moduleName && !seenModules.has(moduleName)) {
                seenModules.add(moduleName);
                moduleNames.push(moduleName);
            }
        });
        const lines = [];
        const coreImports = ['Component'];
        if (hasOutputs) {
            coreImports.push('Output', 'EventEmitter');
        }
        if (hasLifecycle) {
            coreImports.push('OnInit');
        }
        lines.push(`import { ${coreImports.join(', ')} } from '@angular/core';`);
        lines.push("import { CommonModule } from '@angular/common';");
        lines.push("import { FormsModule } from '@angular/forms';");
        if (moduleNames.length > 0) {
            lines.push(`import { ${moduleNames.join(', ')} } from '${this.config.libraryPackage}';`);
        }
        return { importStatements: lines.join('\n'), moduleNames };
    }
    handleLiteralBinding(key, item, attrsArr, description, state) {
        if (typeof item === 'string') {
            attrsArr.push(`${key}="${item.replace(/"/g, '&quot;')}"`);
            return;
        }
        if (item && typeof item === 'object') {
            const prevInternalTypes = description.internalTypes;
            const localInternalTypes = new Set(prevInternalTypes);
            description.internalTypes = localInternalTypes;
            this.traverseState(item, description);
            const requiresStateHoist = localInternalTypes.has('JSFunction') ||
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
            attrsArr.push(`[${key}]='${safeExpr}'`);
            return;
        }
        attrsArr.push(`[${key}]="${item}"`);
    }
    handleEventBinding(key, item, actionNames, schemaMethods) {
        const eventKey = toEventKey(key);
        if (item?.type === JS_FUNCTION) {
            const fnInfo = this.getFunctionInfo(item.value ?? '');
            if (!fnInfo) {
                return `(${eventKey})=""`;
            }
            this.templateMethodCounter++;
            const methodName = `__handle${this.templateMethodCounter}`;
            let body = fnInfo.body;
            if (actionNames) {
                body = this.transformCallActionCalls(body, actionNames);
            }
            body = body.replace(/this\.props\./g, 'this.');
            const freeVars = this.extractFreeVariables(body);
            let sigParams;
            if (item.params?.length) {
                sigParams = ['$event', ...freeVars, ...item.params];
            }
            else if (freeVars.length > 0) {
                sigParams = [...freeVars];
            }
            else {
                sigParams = [];
            }
            const returnType = fnInfo.type ? 'Promise<void>' : 'void';
            const asyncPrefix = fnInfo.type ? `${fnInfo.type} ` : '';
            const paramsWithTypes = sigParams.length > 0
                ? sigParams.map((v) => `${v}: any`).join(', ')
                : '';
            const methodSignature = paramsWithTypes
                ? `${asyncPrefix}${methodName}(${paramsWithTypes}): ${returnType}`
                : `${asyncPrefix}${methodName}(): ${returnType}`;
            this.templateGeneratedMethods.push(`${methodSignature} { ${body} }`);
            const callArgs = sigParams.join(', ');
            return `(${eventKey})="${methodName}(${callArgs})"`;
        }
        if (item?.type !== JS_EXPRESSION) {
            return '';
        }
        const eventHandler = (item.value ?? '').replace(/this\.(props\.)?/g, '');
        if (item.params?.length) {
            const extendParams = item.params.join(',');
            return `(${eventKey})="${eventHandler}($event, ${extendParams})"`;
        }
        if (/^\w+$/.test(eventHandler)) {
            if (schemaMethods && schemaMethods[eventHandler]) {
                const methodInfo = this.getFunctionInfo(schemaMethods[eventHandler].value);
                if (methodInfo && methodInfo.params.length > 0) {
                    return `(${eventKey})="${eventHandler}($event)"`;
                }
            }
            return `(${eventKey})="${eventHandler}()"`;
        }
        return `(${eventKey})="${eventHandler}"`;
    }
    handleSlotBinding(item) {
        const { name, params } = item ?? {};
        const slotName = name || (typeof item === 'string' ? item : 'default');
        return `<!-- slot: ${slotName} -->`;
    }
    handleBinding(props, attrsArr, description, state, componentName, actionNames, schemaMethods) {
        Object.entries(props).forEach(([rawKey, rawItem]) => {
            let key = rawKey === 'className' ? 'class' : rawKey;
            if (this.config.propBlacklist?.[componentName ?? '']?.includes(key)) {
                return;
            }
            const rename = this.config.propRename?.[componentName ?? '']?.[key];
            if (rename) {
                key = rename;
            }
            if (this.processLibrarySpecificProp(componentName ?? '', key, rawItem, props, attrsArr, description, state, actionNames, schemaMethods)) {
                return;
            }
            // === Common Angular logic below ===
            if (key === 'slot') {
                attrsArr.push(this.handleSlotBinding(rawItem));
                return;
            }
            const item = rawItem;
            const propType = this.resolvePropValueType(rawItem);
            if (this.isOnEventKey(key)) {
                const eventBinding = this.handleEventBinding(key, item, actionNames, schemaMethods);
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
                this.hoistPropToState(key, rawItem, attrsArr, state);
                return;
            }
            if (propType === JS_EXPRESSION) {
                if (item.model) {
                    attrsArr.push(`[(ngModel)]="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
                    return;
                }
                attrsArr.push(`[${key}]="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
            }
        });
    }
    recurseChildren(children, state, description, result, actionNames, schemaMethods) {
        if (Array.isArray(children)) {
            result.push(children.map((child) => this.generateTemplate(child, state, description, false, actionNames, schemaMethods)).join(''));
            return;
        }
        result.push(children || '');
    }
    generateSlotTemplate(item, description, state = {}, actionNames, schemaMethods) {
        const result = [];
        const { componentName, component: componentAlias, props = {}, children, condition } = item;
        const comp = componentName || componentAlias || 'div';
        if (comp === 'Text') {
            const textProp = props['text'];
            if (textProp && typeof textProp === 'object' && textProp.type === 'JSExpression') {
                const textValue = textProp.value ?? '';
                return `{{ ${textValue.replace(/this\.(props\.)?/g, '')} }}`;
            }
            return `{{ ${props['text'] || ''} }}`;
        }
        const tag = this.resolveComponentTag(comp);
        description.componentSet.add(comp);
        const attrsArr = [];
        const extraDirective = this.resolveExtraDirective(comp);
        if (extraDirective) {
            attrsArr.push(extraDirective);
        }
        if (condition) {
            const conditionValue = condition.type
                ? condition.value?.replace(/this\./g, '') ?? condition
                : condition;
            result.push(`{ ${conditionValue} && `);
        }
        result.push(`<${tag} `);
        this.handleBinding(props, attrsArr, description, state, comp, actionNames, schemaMethods);
        result.push(attrsArr.join(' '));
        if (this.voidElements.includes(tag)) {
            result.push(' />');
        }
        else {
            result.push('>');
            if (Array.isArray(children)) {
                result.push(children.map((child) => this.generateSlotTemplate(child, description, state, actionNames, schemaMethods)).join(''));
            }
            else if (children?.type === 'JSExpression') {
                result.push(`{ ${children.value?.replace(/this\./g, '') ?? ''} }`);
            }
            else if (children?.type === 'i18n') {
                result.push(`{t('${children.key ?? ''}')}`);
            }
            else {
                result.push(children || '');
            }
            result.push(`</${tag}>`);
        }
        if (condition) {
            result.push(' }');
        }
        return result.join('');
    }
    transformStateType(current, prop, description, rootState) {
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
            }
            else {
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
        const slotValues = value.map((item) => this.generateSlotTemplate(item, description, rootState, undefined, undefined)).join('');
        current[prop] = `${start}({ ${params.join(',')} }, h) => ${slotValues}${end}`;
    }
    traverseState(state, description, rootState = state) {
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
    generateTemplate(schema, state, description, isRootNode = true, actionNames, schemaMethods) {
        const result = [];
        const { componentName, loop, loopArgs = ['item'], condition, props = {}, children } = schema;
        if (this.isEmptySlotNode(componentName, children)) {
            return '';
        }
        if (componentName === 'Text' && !isRootNode) {
            const textProp = props['text'];
            if (textProp && typeof textProp === 'object' && textProp.type === 'JSExpression') {
                const textValue = textProp.value ?? '';
                return `{{ ${textValue.replace(/this\.(props\.)?/g, '')} }}`;
            }
            return `{{ ${props['text'] || ''} }}`;
        }
        let component;
        if (isRootNode) {
            component = 'div';
        }
        else {
            component = this.resolveComponentTag(componentName || 'div');
        }
        if (!isRootNode && componentName) {
            description.componentSet.add(componentName);
        }
        result.push(`\n<${component} `);
        const attrsArr = [];
        const extraDirective = componentName ? this.resolveExtraDirective(componentName) : undefined;
        if (extraDirective) {
            attrsArr.push(extraDirective);
        }
        if (loop) {
            const loopData = loop.type
                ? (loop.value ?? '').replace(/this\.(props\.)?/g, '')
                : JSON.stringify(loop).replace(/"/g, '&quot;');
            const itemVar = loopArgs[0] || 'item';
            const indexVar = loopArgs[1];
            const indexClause = indexVar ? `; let ${indexVar} = index` : '';
            attrsArr.push(`*ngFor="let ${itemVar} of ${loopData}${indexClause}"`);
        }
        if (typeof condition === 'object' || typeof condition === 'boolean') {
            const isObjectCondition = typeof condition === 'object' && condition !== null;
            const conditionObj = condition;
            const conditionValue = isObjectCondition && conditionObj.type
                ? (conditionObj.value ?? '').replace(/this\.(props\.)?/g, '')
                : condition;
            const kind = isObjectCondition ? (conditionObj.kind || 'if') : 'if';
            if (kind === 'show') {
                attrsArr.push(`[hidden]="!(${conditionValue})"`);
            }
            else if (kind === 'else') {
                attrsArr.push(`*ngIf="!(${conditionValue})"`);
            }
            else {
                attrsArr.push(`*ngIf="${conditionValue}"`);
            }
        }
        this.handleBinding(props, attrsArr, description, state, componentName, actionNames, schemaMethods);
        result.push(attrsArr.join(' '));
        if (this.voidElements.includes(component)) {
            result.push(' />');
        }
        else {
            result.push('>');
            const transformedChildren = this.processLibrarySpecificChildren(componentName ?? '', children);
            this.recurseChildren(transformedChildren ?? children, state, description, result, actionNames, schemaMethods);
            result.push(`</${component}>`);
        }
        return result.join('');
    }
    buildStateFields(schema, description) {
        const { state = {} } = schema;
        this.traverseState(state, description);
        const stateStr = unwrapExpression(JSON.stringify(state, null, 2));
        if (!stateStr || stateStr === '{}') {
            return '';
        }
        return `state = ${stateStr};`;
    }
    buildMethods(schema, actionNames) {
        const { methods = {} } = schema;
        const methodLines = Object.entries(methods).map(([key, item]) => {
            const info = this.getFunctionInfo(item.value);
            if (!info) {
                let body = item.value.replace(/this\.props\./g, 'this.');
                body = this.transformCallActionCalls(body, actionNames);
                return `${key} = ${body};`;
            }
            const asyncPrefix = info.type ? `${info.type} ` : '';
            const methodName = asyncPrefix && key.startsWith(asyncPrefix.trim())
                ? key.slice(asyncPrefix.length)
                : key;
            let body = info.body.replace(/this\.props\./g, 'this.');
            body = this.transformCallActionCalls(body, actionNames);
            const returnType = info.type ? 'Promise<void>' : 'void';
            return `${asyncPrefix}${methodName}(${info.params.join(', ')}): ${returnType} { ${body} }`;
        });
        return methodLines.join('\n\n  ');
    }
    buildAngularComponentSource({ schema, name, }) {
        const codegenMeta = this.createCodegenMeta();
        this.templateGeneratedMethods = [];
        this.templateMethodCounter = 0;
        const actionNames = new Set();
        const schemaMethods = schema.methods;
        const template = this.generateTemplate(schema, schema.state, codegenMeta, true, actionNames, schemaMethods);
        const stateFields = this.buildStateFields(schema, codegenMeta);
        const methods = this.buildMethods(schema, actionNames);
        const lifeCycles = schema.lifeCycles;
        let lifecycleMethods = '';
        if (lifeCycles?.onMounted) {
            const mountedFn = lifeCycles.onMounted;
            const fnInfo = this.getFunctionInfo(mountedFn.value ?? '');
            if (fnInfo) {
                let body = fnInfo.body;
                body = this.transformCallActionCalls(body, actionNames);
                body = body.replace(/this\.props\./g, 'this.');
                lifecycleMethods = `ngOnInit(): void { ${body} }`;
            }
        }
        const hasLifecycle = !!lifecycleMethods;
        const { importStatements, moduleNames } = this.buildImports(codegenMeta, actionNames.size > 0, hasLifecycle);
        const selectorName = hyphenate(name || 'SchemaCard');
        const className = capitalize(name || 'SchemaCard');
        const ngImports = ['CommonModule', 'FormsModule', ...moduleNames].join(', ');
        const implementsClause = hasLifecycle ? ' implements OnInit' : '';
        const outputDeclarations = [...actionNames].map((action) => {
            const prop = this.toCamelCase(action);
            if (prop !== action) {
                return `@Output('${action}') ${prop} = new EventEmitter<Record<string, unknown>>();`;
            }
            return `@Output() ${prop} = new EventEmitter<Record<string, unknown>>();`;
        });
        const generatedMethods = this.templateGeneratedMethods.join('\n');
        const classBody = [stateFields, generatedMethods, lifecycleMethods, methods].filter(Boolean).join('\n\n  ');
        const outputBlock = outputDeclarations.length > 0
            ? `\n  ${outputDeclarations.join('\n  ')}\n`
            : '';
        return [
            importStatements,
            '',
            '@Component({',
            `  selector: 'app-${selectorName}',`,
            '  standalone: true,',
            `  imports: [${ngImports}],`,
            `  template: \`${template}\`,`,
            '  styles: [``],',
            '})',
            `export class ${className}Component${implementsClause} {`,
            outputBlock ? `${outputBlock}` : '',
            classBody ? `  ${classBody}` : '',
            '}',
        ].join('\n');
    }
    buildJSFunctionExpression(value, actionNames) {
        const info = this.getFunctionInfo(value);
        if (!info) {
            let result = this.replaceThis(value);
            if (actionNames) {
                result = this.transformCallActionCalls(result, actionNames);
            }
            return result;
        }
        const asyncPrefix = info.type ? `${info.type} ` : '';
        let body = info.body;
        if (actionNames) {
            body = this.transformCallActionCalls(body, actionNames);
        }
        body = body.replace(/this\.props\./g, 'this.');
        return `${asyncPrefix}(${info.params.join(',')}) => { ${body} }`;
    }
    transformCallActionCalls(code, actionNames) {
        return code.replace(/this\.callAction\s*\(\s*['"]([^'"]+)['"]\s*(,\s*([^)]*))?\)/g, (_, name, _commaAndArgs, args) => {
            actionNames.add(name);
            const prop = this.toCamelCase(name);
            return args ? `this.${prop}.emit(${args.trim()})` : `this.${prop}.emit()`;
        });
    }
    hoistPropToState(key, item, attrsArr, state) {
        const valueKey = this.avoidDuplicateString(Object.keys(state), key);
        state[valueKey] = item;
        attrsArr.push(`[${key}]="state.${valueKey}"`);
    }
    async generate({ pageInfo, formatWithPrettier = false, }) {
        const { schema: originSchema, name = 'SchemaCard' } = pageInfo;
        const schema = JSON.parse(JSON.stringify(this.normalizeIncomingSchema(originSchema)));
        const angularCode = this.buildAngularComponentSource({ schema, name });
        const panelName = `${hyphenate(name)}.component.ts`;
        const compileErrors = [];
        const panel = {
            panelName,
            panelValue: angularCode,
            panelType: 'angular',
            prettierOpts: {
                semi: false,
                singleQuote: true,
                printWidth: 120,
                trailingComma: 'none',
                endOfLine: 'auto',
                tabWidth: 2,
                parser: 'typescript',
            },
            type: 'page',
        };
        const result = { ...panel, errors: compileErrors };
        if (formatWithPrettier) {
            result.panelValue = await this.formatWithPrettier(result.panelValue, result.prettierOpts);
        }
        return result;
    }
}
