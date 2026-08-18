import { JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT } from './constants';
export class CodeGeneratorBase {
    replaceThis(value) {
        return value.replace(/this\./g, '');
    }
    toCamelCase(str) {
        return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    }
    avoidDuplicateString(existings, baseName) {
        let result = baseName;
        let suffix = 1;
        while (existings.includes(result)) {
            result = `${baseName}${suffix}`;
            suffix++;
        }
        return result;
    }
    isOnEventKey(key) {
        return /^on([A-Z]\w*)/.test(key);
    }
    resolvePropValueType(value) {
        const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT];
        if (value && typeof value === 'object' && 'type' in value) {
            const protocolType = value.type;
            if (typeof protocolType === 'string' && builtInTypes.includes(protocolType)) {
                return protocolType;
            }
        }
        return 'literal';
    }
    getFunctionInfo(fnStr) {
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
    extractFreeVariables(body) {
        let cleaned = body
            .replace(/this\.\w+/g, '')
            .replace(/'[^']*'/g, '')
            .replace(/"[^"]*"/g, '')
            .replace(/`[^`]*`/g, '')
            .replace(/\w+\s*:/g, '')
            .replace(/\.\w+/g, '')
            .replace(/\b\d+(\.\d+)?\b/g, '');
        const identifiers = cleaned.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
        const keywords = new Set([
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
            'return', 'var', 'let', 'const', 'function', 'typeof', 'instanceof',
            'new', 'delete', 'void', 'yield', 'async', 'await', 'of', 'in',
            'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
            'console', 'Math', 'Date', 'JSON', 'Object', 'String', 'Number', 'Array',
            'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Error', 'Map', 'Set', 'Promise',
            'emit', 'push', 'pop', 'filter', 'map', 'find', 'forEach', 'reduce', 'sort',
            'slice', 'splice', 'join', 'includes', 'indexOf', 'length', 'keys', 'values',
            'alert', 'fetch', 'setTimeout', 'setInterval', 'parse', 'stringify',
            'state', 'props', 'event', 'callback', 'index',
        ]);
        return [...new Set(identifiers.filter((id) => !keywords.has(id)))];
    }
    createCodegenMeta() {
        return {
            componentSet: new Set(),
            iconComponents: { componentNames: [], exportNames: [] },
            internalTypes: new Set(),
            stateAccessors: [],
        };
    }
    isEmptySlotNode(componentName, children) {
        return (componentName === 'template' &&
            !children?.length &&
            !children?.type);
    }
    normalizeIncomingSchema(origin) {
        if (origin == null) {
            return { componentName: 'Page', children: [] };
        }
        if (typeof origin === 'string') {
            const trimmed = origin.trim();
            if (!trimmed) {
                return { componentName: 'Page', children: [] };
            }
            try {
                return JSON.parse(trimmed);
            }
            catch {
                return { componentName: 'Page', children: [] };
            }
        }
        return origin;
    }
    async formatWithPrettier(source, prettierOpts) {
        try {
            const [{ format }, { default: htmlPlugin }, { default: babelPlugin }, { default: estreePlugin }] = await Promise.all([
                import('prettier/standalone'),
                import('prettier/plugins/html'),
                import('prettier/plugins/babel'),
                import('prettier/plugins/estree'),
            ]);
            return await format(source, {
                ...prettierOpts,
                plugins: [htmlPlugin, babelPlugin, estreePlugin],
            });
        }
        catch {
            return source;
        }
    }
}
