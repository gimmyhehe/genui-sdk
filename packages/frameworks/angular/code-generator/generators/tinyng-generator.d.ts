import type { NodeSchema, CardSchema } from '@opentiny/genui-sdk-core';
import type { ICodeGeneratorParams, ICodegenDescription, ICodeGeneratorResult } from '../types';
import { AngularCodeGeneratorBase } from '../angular-code-generator-base';
export declare class TinyNGCodeGenerator extends AngularCodeGeneratorBase {
    constructor();
    protected processLibrarySpecificProp(componentName: string, key: string, rawItem: unknown, props: Record<string, unknown>, attrsArr: string[], _description: ICodegenDescription, _state: Record<string, unknown>, _actionNames?: Set<string>, _schemaMethods?: Record<string, {
        value: string;
    }>): boolean;
    protected buildStateFields(schema: CardSchema, description: ICodegenDescription): string;
    protected processLibrarySpecificChildren(componentName: string, children: NodeSchema[] | NodeSchema | string | undefined): NodeSchema[] | NodeSchema | string | undefined;
}
export declare const generateCode: (params: ICodeGeneratorParams) => Promise<ICodeGeneratorResult>;
