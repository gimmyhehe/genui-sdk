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
  panelType: 'vue';
  prettierOpts: Record<string, unknown>;
  type: 'page';
  filePath: string;
}

export interface ICodeGeneratorParams {
  pageInfo: {
    schema: CardSchema;
    name?: string;
  };
  componentsMap?: IComponentMapItem[];
}
