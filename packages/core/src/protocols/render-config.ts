import type { CardSchema } from './schema';

export interface IExample {
  id?: string;
  name: string;
  description?: string;
  schema: CardSchema;
}

export interface IPromptSectionConfig {
  includeJsonSchema?: boolean;
  includeSnippets?: boolean;
}

export interface IRendererConfig {
  materialsList: any[];
  examples: IExample[];
  whiteList: string[];
  wrapperComponent?: string;
  prompt?: IPromptSectionConfig;
}
