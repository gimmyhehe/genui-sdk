export const findComponentPath = (currentSchema: any, id: string): string | null => {
  if (!currentSchema || !id) {
    return null;
  }

  const findInNode = (node: any, path: string = ''): string | null => {
    if (node?.id === id) {
      return path || '/';
    }

    if (Array.isArray(node?.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childPath = path ? `${path}/children/${i}` : `/children/${i}`;
        const result = findInNode(child, childPath);
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  };

  return findInNode(currentSchema);
};

export function getComponentItem(schema: any, componentPath: string, indexMode: boolean = false) {