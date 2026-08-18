import type { CardSchema } from '@opentiny/genui-sdk-core';
import type { ICodeGeneratorParams, ICodegenDescription, IFrameworkCodeGenerator, ICodeGeneratorResult } from './types';
export declare abstract class CodeGeneratorBase implements IFrameworkCodeGenerator<ICodeGeneratorParams, ICodeGeneratorResult> {
    protected replaceThis(value: string): string;
    protected toCamelCase(str: string): string;
    protected avoidDuplicateString(existings: string[], baseName: string): string;
    protected isOnEventKey(key: string): boolean;
    protected resolvePropValueType(value: unknown): string;
    protected getFunctionInfo(fnStr: string): {
        type: string;
        params: string[];
        body: string;
    } | null;
    protected extractFreeVariables(body: string): string[];
    protected createCodegenMeta(): ICodegenDescription;
    protected isEmptySlotNode(componentName: string | undefined, children: unknown): boolean;
    protected normalizeIncomingSchema(origin: CardSchema | string | null | undefined): CardSchema;
    protected formatWithPrettier(source: string, prettierOpts: Record<string, unknown>): Promise<string>;
    abstract generate(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult>;
}
