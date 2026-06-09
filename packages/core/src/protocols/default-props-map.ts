type DefaultValueMap = Record<string, any>;

export type MaterialDefaultValueMap = Record<string, DefaultValueMap>;

interface IComponentLike {
  component?: string;
  schema?: {
    properties?: any[];
  };
}

interface IMaterialLike {
  data?: {
    materials?: {
      components?: IComponentLike[];
    };
  };
}

const collectPropertyDefaults = (
  items: any[] | undefined,
  parentPath: string[],
  result: DefaultValueMap,
) => {
  items?.forEach((item) => {
    const currentPath = item?.property ? parentPath.concat(item.property) : parentPath;

    if (item?.property && Object.prototype.hasOwnProperty.call(item, 'defaultValue')) {
      result[currentPath.join('.')] = item.defaultValue;
    }

    if (Array.isArray(item?.content)) {
      collectPropertyDefaults(item.content, currentPath, result);
    }

    if (Array.isArray(item?.properties)) {
      collectPropertyDefaults(item.properties, currentPath, result);
    }
  });
};

/**
 * 从物料配置中提取各组件的默认 props 映射表，供 renderer 在初始化 schema 时使用。
 *
 * @param materialsList - 物料列表
 * @returns 组件名到默认 props 的映射对象
 */
export const buildMaterialDefaultValueMap = (
  materialsList: IMaterialLike[],
): MaterialDefaultValueMap => {
  const result: MaterialDefaultValueMap = {};

  materialsList.forEach((material) => {
    material?.data?.materials?.components?.forEach((component) => {
      const componentName = component?.component;
      if (typeof componentName !== 'string') {
        return;
      }

      const defaults: DefaultValueMap = {};
      collectPropertyDefaults(component.schema?.properties, [], defaults);

      if (Object.keys(defaults).length > 0) {
        result[componentName] = defaults;
      }
    });
  });

  return result;
};
