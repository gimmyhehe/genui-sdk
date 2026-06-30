import { components, type IComponents } from './components';
import { requiredCompleteFieldSelectors } from './required-complete-field-selectors';

export interface IMaterials {
  components: IComponents;
  requiredCompleteFieldSelectors?: string[];
}

export const materials = {
  components,
  requiredCompleteFieldSelectors,
};
