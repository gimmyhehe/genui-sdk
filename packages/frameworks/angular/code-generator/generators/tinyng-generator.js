import { JS_EXPRESSION } from '../constants';
import { AngularCodeGeneratorBase } from '../angular-code-generator-base';
import { componentSelector, moduleRefMap, componentExtraSelector } from './tinyng-map';
const TINYNG_CONFIG = {
    componentSelector,
    moduleRefMap,
    libraryPackage: '@opentiny/ng',
    componentExtraSelector,
    extraVoidElements: ['ti-image'],
    propBlacklist: { TiTable: ['border', 'stripe'] },
    propRename: { TiPagination: { total: 'totalNumber' } },
};
export class TinyNGCodeGenerator extends AngularCodeGeneratorBase {
    constructor() {
        super(TINYNG_CONFIG);
    }
    processLibrarySpecificProp(componentName, key, rawItem, props, attrsArr, _description, _state, _actionNames, _schemaMethods) {
        const item = rawItem;
        const propType = this.resolvePropValueType(rawItem);
        if (componentName === 'TiPagination' && key === 'pageSizes' && propType === 'literal' && Array.isArray(rawItem)) {
            const pageSizeExpr = props['pageSize'];
            const sizeValue = pageSizeExpr?.type === JS_EXPRESSION
                ? (pageSizeExpr.value ?? '').replace(/this\.(props\.)?/g, '')
                : `${rawItem[0] || 10}`;
            attrsArr.push(`[pageSize]="{ options: [${rawItem.join(', ')}], size: ${sizeValue} }"`);
            return true;
        }
        if (propType === JS_EXPRESSION) {
            if (componentName === 'TiPagination' && key === 'pageSize' && 'pageSizes' in props) {
                return true;
            }
            if (componentName === 'TiTable' && key === 'displayedData' && item.model) {
                attrsArr.push(`[(displayedData)]="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
                return true;
            }
            if (componentName === 'TiTable' && key === 'srcData') {
                const rawValue = (item.value ?? '').replace(/this\.(props\.)?/g, '');
                attrsArr.push(`[srcData]="${rawValue}"`);
                return true;
            }
            if (componentName === 'TiPagination' && key === 'pageSize') {
                const rawValue = (item.value ?? '').replace(/this\.(props\.)?/g, '');
                attrsArr.push(`[pageSize]="{ size: ${rawValue} }"`);
                return true;
            }
        }
        return false;
    }
    buildStateFields(schema, description) {
        const state = schema.state;
        if (state?.['srcData'] && typeof state['srcData'] === 'object' && !Array.isArray(state['srcData'])) {
            const srcData = state['srcData'];
            if (srcData['state'] && typeof srcData['state'] === 'object' && !Array.isArray(srcData['state'])) {
                const srcState = srcData['state'];
                if (srcState['searched'] === undefined)
                    srcState['searched'] = false;
                if (srcState['sorted'] === undefined)
                    srcState['sorted'] = false;
                if (srcState['paginated'] === undefined)
                    srcState['paginated'] = false;
            }
        }
        return super.buildStateFields(schema, description);
    }
    processLibrarySpecificChildren(componentName, children) {
        if (componentName === 'TiFormField' && Array.isArray(children)) {
            return children.map((child) => {
                const childSchema = child;
                if (childSchema.componentName === 'TiItem') {
                    return childSchema;
                }
                return { componentName: 'TiItem', children: [childSchema] };
            });
        }
        return undefined;
    }
}
export const generateCode = (params) => new TinyNGCodeGenerator().generate(params);
