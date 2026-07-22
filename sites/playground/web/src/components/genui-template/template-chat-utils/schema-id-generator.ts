import { generateId } from '../../../utils';

function collectExistingIds(node: any, ids: Set<string> = new Set()): Set<string> {
  if (!node || typeof node !== 'object') {
    return ids;
  }
  if (typeof node.id === 'string' && node.id) {
    ids.add(node.id);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectExistingIds(child, ids);
    }
  }
  return ids;
}

const mergeIdsFromPrevious = (node: any, prevNode: any, usedIds: Set<string>) => {
  if (!node || typeof node !== 'object' || !prevNode || typeof prevNode !== 'object') {
    return;
  }

  if (!node.id && prevNode.id && !usedIds.has(prevNode.id)) {
    node.id = prevNode.id;
    usedIds.add(prevNode.id);
  }

  if (!Array.isArray(node.children) || !Array.isArray(prevNode.children)) {
    return;
  }

  const limit = Math.min(node.children.length, prevNode.children.length);
  for (let i = 0; i < limit; i++) {
    mergeIdsFromPrevious(node.children[i], prevNode.children[i], usedIds);
  }
};

export interface GenerateIdOptions {
  previousSchema?: Record<string, unknown> | null;
}

export const generateIdForComponents = (schema: any, options?: GenerateIdOptions) => {
  const usedIds = collectExistingIds(schema);

  if (options?.previousSchema) {
    mergeIdsFromPrevious(schema, options.previousSchema, usedIds);
  }

  const claimedIds = new Set<string>();

  const traverse = (node: any, index: number | null = null) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        traverse(node.children[i], i);
      }
    }
    if (index !== null) {
      node.index = index;
    }

    if (node.id && !claimedIds.has(node.id)) {
      claimedIds.add(node.id);
      return;
    }
    node.id = generateId();
    claimedIds.add(node.id);
  };

  traverse(schema);

  return schema;
};
