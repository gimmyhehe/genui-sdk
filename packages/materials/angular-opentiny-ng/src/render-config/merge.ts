import bundleJson from './bundle.json' with { type: 'json' };
import { examples } from './example-schema';
import { whiteList } from './white-list';

// 定义渲染器配置的类型
interface IMaterialsConfig {
  materials: any[];
  examples: any[];
  whiteList: string[];
  wrapperComponent: string;
  promptConfig?: {
    includeJsonSchema?: boolean;
    includeSnippets?: boolean;
  };
}

export const ngMaterialsConfig: IMaterialsConfig = {
  materials: [bundleJson],
  examples,
  whiteList,
  wrapperComponent: 'TiCard',
  promptConfig: { includeJsonSchema: true, includeSnippets: true },
};
