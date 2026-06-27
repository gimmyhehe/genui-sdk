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

export interface IMaterialsConfig {
  materials: any[];
  examples: IExample[];
  whiteList: string[];
  wrapperComponent?: string;
  promptConfig?: IPromptSectionConfig;
}
