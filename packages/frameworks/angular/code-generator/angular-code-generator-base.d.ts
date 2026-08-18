import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import type { ICodeGeneratorParams, ICodegenDescription, IAngularLibraryConfig, ICodeGeneratorResult } from './types';
import { CodeGeneratorBase } from './code-generator-base';
export declare class AngularCodeGeneratorBase extends CodeGeneratorBase {
    protected readonly config: IAngularLibraryConfig;
    constructor(config: IAngularLibraryConfig);
    protected templateActionNames: Set<string>;
    protected templateGeneratedMethods: string[];
    private templateMethodCounter;
    protected get voidElements(): string[];
    protected resolveComponentTag(componentName: string): string;
    protected resolveExtraDirective(componentName: string): string | undefined;
    protected processLibrarySpecificProp(_componentName: string, _key: string, _rawItem: unknown, _props: Record<string, unknown>, _attrsArr: string[], _description: ICodegenDescription, _state: Record<string, unknown>, _actionNames?: Set<string>, _schemaMethods?: Record<string, {
        value: string;
    }>): boolean;
    protected processLibrarySpecificChildren(_componentName: string, _children: NodeSchema[] | NodeSchema | string | undefined): NodeSchema[] | NodeSchema | string | undefined;
    protected buildImports(description: ICodegenDescription, hasOutputs?: boolean, hasLifecycle?: boolean): {
        importStatements: string;
        moduleNames: string[];
    };
    protected handleLiteralBinding(key: string, item: unknown, attrsArr: string[], description: ICodegenDescription, state: Record<string, unknown>): void;
    protected handleEventBinding(key: string, item: {
        type?: string;
        value?: string;
        params?: string[];
    }, actionNames?: Set<string>, schemaMethods?: Record<string, {
        value: string;
    }>): string;
    protected handleSlotBinding(item: Record<string, unknown> | string): string;
    protected handleBinding(props: Record<string, unknown>, attrsArr: string[], description: ICodegenDescription, state: Record<string, unknown>, componentName?: string, actionNames?: Set<string>, schemaMethods?: Record<string, {
        value: string;
    }>): void;
    protected recurseChildren(children: NodeSchema[] | NodeSchema | string | undefined, state: Record<string, unknown>, description: ICodegenDescription, result: string[], actionNames?: Set<string>, schemaMethods?: Record<string, {
        value: string;
    }>): void;
    protected generateSlotTemplate(item: Record<string, any>, description: ICodegenDescription, state?: Record<string, unknown>, actionNames?: Set<string>, schemaMethods?: Record<string, {
        value: string;
    }>): string;
    protected transformStateType(current: Record<string, any>, prop: string, description: ICodegenDescription, rootState: Record<string, any>): void;
    protected traverseState(state: Record<string, any>, description: ICodegenDescription, rootState?: Record<string, any>): void;
    protected generateTemplate(schema: CardSchema, state: Record<string, any>, description: ICodegenDescription, isRootNode?: boolean, actionNames?: Set<string>, schemaMethods?: Record<string, {
        value: string;
    }>): string;
    protected buildStateFields(schema: CardSchema, description: ICodegenDescription): string;
    protected buildMethods(schema: CardSchema, actionNames: Set<string>): string;
    protected buildAngularComponentSource({ schema, name, }: {
        schema: CardSchema;
        name?: string;
    }): string;
    protected buildJSFunctionExpression(value: string, actionNames?: Set<string>): string;
    protected transformCallActionCalls(code: string, actionNames: Set<string>): string;
    protected hoistPropToState(key: string, item: unknown, attrsArr: string[], state: Record<string, unknown>): void;
    generate({ pageInfo, formatWithPrettier, }: ICodeGeneratorParams): Promise<ICodeGeneratorResult>;
}
