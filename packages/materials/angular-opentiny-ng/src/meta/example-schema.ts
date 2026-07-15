import { cardSchema, type IExample } from '@opentiny/genui-sdk-core';
import formSchema from './examples/form.json' with { type: 'json' };
import infoCardSchema from './examples/info.json' with { type: 'json' };
import gridSchema from './examples/grid.json' with { type: 'json' };
import tabsSchema from './examples/tabs.json' with { type: 'json' };
import paginationSchema from './examples/pagination.json' with { type: 'json' };

function createExample(id: string, name: string, schema: unknown): IExample {
  return { id, name, schema: cardSchema.parse(schema) };
}

export const examples: IExample[] = [
  createExample('form', '双向绑定的表单', formSchema),
  createExample('info', '信息展示卡片', infoCardSchema),
  createExample('grid', '表格卡片', gridSchema),
  createExample('tabs', 'Tabs卡片', tabsSchema),
  createExample('pagination', '分页表格', paginationSchema),
];
