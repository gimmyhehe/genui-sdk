import { applyDefaultPropsToProps, type DefaultPropsMap, type PropsValue } from '../src/apply-default-props';

const COMPONENT = 'Select';

const defaultPropsMap: DefaultPropsMap = {
  [COMPONENT]: {
    placeholder: '请选择',
    type: 'primary',
    clearable: true,
    'style.color': '#333',
    'options.*.label': '默认标签',
    meta: { nested: { count: 1 } },
  },
};

const schemaProps: Record<string, PropsValue> = {
  size: 'small',
  type: 'danger',
  options: [
    { value: 'a' },
    { value: 'b', label: '已有标签' },
    null,
    'invalid-item',
  ],
};

function cloneSchemaProps(): Record<string, PropsValue> {
  return structuredClone(schemaProps);
}

function applyDefaults(props: Record<string, PropsValue>): void {
  applyDefaultPropsToProps(COMPONENT, props, defaultPropsMap);
}

describe('applyDefaultPropsToProps', () => {
  it('补齐 schema 中缺失的叶子属性', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    expect(props['size']).toBe('small');
    expect(props['placeholder']).toBe('请选择');
    expect(props['clearable']).toBe(true);
  });

  it('不覆盖 schema 中已有的值', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    expect(props['type']).toBe('danger');
  });

  it('按嵌套路径创建对象并补齐默认值', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    expect(props['style']).toEqual({ color: '#333' });
  });

  it('通配路径为 options 每一项补齐 label', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    const options = props['options'] as PropsValue[];
    expect(options[0]).toEqual({ value: 'a', label: '默认标签' });
    expect(options[1]).toEqual({ value: 'b', label: '已有标签' });
    expect(options[2]).toEqual({ label: '默认标签' });
    expect(options[3]).toBe('invalid-item');
  });

  it('数组下标路径在空 props 上创建数组和对象', () => {
    const props: Record<string, PropsValue> = {};
    applyDefaultPropsToProps(COMPONENT, props, {
      [COMPONENT]: { 'options.0.label': '首项默认' },
    });

    expect(props['options']).toEqual([{ label: '首项默认' }]);
  });

  it('options 不是数组时跳过数组相关路径', () => {
    const props = cloneSchemaProps();
    props['options'] = 'not-array';
    applyDefaults(props);

    expect(props['options']).toBe('not-array');
  });

  it('options 不存在时跳过通配路径', () => {
    const props = cloneSchemaProps();
    delete props['options'];
    applyDefaults(props);

    expect(props['options']).toBeUndefined();
  });

  it('默认值使用深拷贝，不污染 defaultPropsMap', () => {
    const props: Record<string, PropsValue> = {};
    applyDefaults(props);

    expect(props['meta']).toEqual({ nested: { count: 1 } });
    (props['meta'] as Record<string, PropsValue>)['nested'] = { count: 2 };
    expect(defaultPropsMap[COMPONENT]!['meta']).toEqual({ nested: { count: 1 } });
  });

  it('defaultPropsMap 无效时不修改 props', () => {
    const props = cloneSchemaProps();
    const before = structuredClone(props);

    applyDefaultPropsToProps(COMPONENT, props, null);
    applyDefaultPropsToProps(COMPONENT, props, undefined);
    applyDefaultPropsToProps(COMPONENT, props, {} as DefaultPropsMap);

    expect(props).toEqual(before);
  });

  it('组件无配置时不修改 props', () => {
    const props = cloneSchemaProps();
    const before = structuredClone(props);

    applyDefaultPropsToProps('OtherComponent', props, defaultPropsMap);

    expect(props).toEqual(before);
  });
});
