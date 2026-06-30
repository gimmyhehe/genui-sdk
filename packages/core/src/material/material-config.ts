import type { CardSchema } from '../protocols/schema';
import type { IMaterials } from './materials';

export interface IExample {
  id?: string;
  name: string;
  description?: string;
  schema: CardSchema;
}

export interface IPromptSectionConfig {
  includeSnippets?: boolean;
  includeExamples?: boolean;
}

export interface IMaterialsConfig {
  materials: IMaterials[];
  examples: IExample[];
  whiteList: string[];
  wrapperComponent?: string;
  promptConfig?: IPromptSectionConfig;
  additionRules?: string[];
}
