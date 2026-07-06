import type { CardSchema } from '../protocols/schema';
import type { IMaterialsProtocol } from './materials';

export interface IExample {
  id?: string;
  name: string;
  description?: string;
  schema: CardSchema;
}

export interface IMaterialsMeta {
  materials: IMaterialsProtocol[];
  examples: IExample[];
  whiteList: string[];
  wrapperComponent?: string;
  rules?: string[];
}
