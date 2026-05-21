import bundleJson from './bundle.json' with { type: 'json' };
import builtinJson from './builtin.json' with { type: 'json' };
import chartJson from './chart.json' with { type: 'json' };
import extendJson from './extend.json' with { type: 'json' };
import { examples } from './example-schema';
import { whiteList } from './white-list';

export interface IRendererConfig {
  materialsList: unknown[];
  examples: typeof examples;
  whiteList: string[];
  wrapperComponent?: string;
}

export const rendererConfig: IRendererConfig = {
  materialsList: [bundleJson, builtinJson, chartJson, extendJson],
  examples,
  whiteList,
  wrapperComponent: 'ElCard',
};
