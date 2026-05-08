type DefaultValueMap = Record<string, any>;
export type MaterialDefaultValueRegistry = Map<string, DefaultValueMap>;

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

interface IRegistryOptions {
  includeComponent?: (componentName: string) => boolean;
}

const isObjectRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneDefaultValue = (value: any) => {
  if (!isObjectRecord(value) && !Array.isArray(value)) {
    return value;
  }
  return structuredClone(value);
};

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

export const buildMaterialDefaultValueRegistry = (
  materialsList: IMaterialLike[],
  options: IRegistryOptions = {},
): MaterialDefaultValueRegistry => {
  const registry: MaterialDefaultValueRegistry = new Map();
  const includeComponent = options.includeComponent || (() => true);

  materialsList.forEach((material) => {
    material?.data?.materials?.components?.forEach((component) => {
      const componentName = component?.component;
      if (typeof componentName !== 'string' || !includeComponent(componentName)) {
        return;
      }

      const defaults: DefaultValueMap = {};
      collectPropertyDefaults(component.schema?.properties, [], defaults);

      if (Object.keys(defaults).length > 0) {
        registry.set(componentName, defaults);
      }
    });
  });

  return registry;
};

const fillMissingValue = (
  target: Record<string, any>,
  propertyPath: string,
  defaultValue: any,
) => {
  const keys = propertyPath.split('.');
  let current = target;

  for (const key of keys.slice(0, -1)) {
    const nextValue = current[key];
    if (nextValue == null) {
      current[key] = {};
      current = current[key];
      continue;
    }

    if (!isObjectRecord(nextValue)) {
      return;
    }

    current = nextValue;
  }

  const leafKey = keys[keys.length - 1];
  if (current[leafKey] == null) {
    current[leafKey] = cloneDefaultValue(defaultValue);
  }
};

const applyDefaultsToNode = (
  node: Record<string, any>,
  registry: MaterialDefaultValueRegistry,
) => {
  const componentName = node.componentName;
  if (typeof componentName !== 'string') {
    return;
  }

  const defaultValueMap = registry.get(componentName);
  if (!defaultValueMap) {
    return;
  }

  if (!isObjectRecord(node.props)) {
    node.props = {};
  }

  Object.entries(defaultValueMap).forEach(([propertyPath, defaultValue]) => {
    fillMissingValue(node.props, propertyPath, defaultValue);
  });
};

const visitPossibleNode = (
  value: unknown,
  registry: MaterialDefaultValueRegistry,
) => {
  if (Array.isArray(value)) {
    value.forEach((item) => visitPossibleNode(item, registry));
    return;
  }

  if (!isObjectRecord(value)) {
    return;
  }

  if (typeof value.componentName === 'string') {
    applyDefaultsToNode(value, registry);
    visitPossibleNode(value.children, registry);
    visitPossibleNode(value.slot, registry);
    return;
  }

  Object.entries(value).forEach(([, item]) => visitPossibleNode(item, registry));
};

export const applyMaterialDefaultsToSchema = (
  schema: Record<string, any>,
  registry: MaterialDefaultValueRegistry,
) => {
  if (!isObjectRecord(schema)) {
    return;
  }

  visitPossibleNode(schema, registry);
};

export const applyMaterialDefaultsToNode = (
  node: Record<string, any>,
  registry: MaterialDefaultValueRegistry,
) => {
  if (!isObjectRecord(node)) {
    return;
  }

  applyDefaultsToNode(node, registry);
};
