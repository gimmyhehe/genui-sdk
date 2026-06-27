import bundleJson from './bundle.json' with { type: 'json' };
import { examples } from './example-schema';
import { whiteList } from './white-list';

// 定义渲染器配置的类型
interface IRendererConfig {
  materialsList: any[];
  examples: any[];
  whiteList: string[];
  wrapperComponent: string;
  prompt?: {
    includeJsonSchema?: boolean;
    includeSnippets?: boolean;
  };
}

export const ngRendererConfig: IRendererConfig = {
  materialsList: [bundleJson],
  examples,
  whiteList,
  wrapperComponent: 'TiCard',
  prompt: { includeJsonSchema: true, includeSnippets: true },
};
