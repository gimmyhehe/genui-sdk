import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { findComponentPath, getPositionRelativePath, mergePath } from './schema-path';

export type IFormattedJsonPatchOperation = JsonPatchOp & {
  id?: string;
  idToPath?: string | null;
  relativePath?: string;
};

function toStandardPatchOp(item: IFormattedJsonPatchOperation): JsonPatchOp {
  const { id, idToPath, relativePath, ...standardOp } = item;
  return standardOp as JsonPatchOp;
}

/**
 * schema / patch 均为纯 JSON，用 JSON 深拷贝避免 structuredClone 无法克隆 Vue Proxy 等对象
 * @param value 待拷贝的值
 * @returns 深拷贝后的纯 JSON 对象
 */
export function clonePlainJson<T>(value: T | null | undefined): T | null {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 格式化 jsonPatch：将带 id 的领域扩展操作转为 RFC 6902 绝对路径
 */
export const formatJsonPatch = (
  currentSchema: any,
  value: any[],
): IFormattedJsonPatchOperation[] => {
  const templeSchema = clonePlainJson(currentSchema ?? {}) ?? {};

  return value.map((originItem: any) => {
    const item = clonePlainJson(originItem) as IFormattedJsonPatchOperation;
    const componentPath = findComponentPath(templeSchema, item.id);
    item.idToPath = componentPath;

    if (!componentPath) {
      console.error(`找不到组件路径: ${item.id}`);
      return item;
    }

    if (item.op !== 'move') {
      if (item.path) {
        item.relativePath = item.path;
        item.path = componentPath === '/' ? item.path : `${componentPath}${item.path}`;
      } else {
        item.path = componentPath;
      }
    }

    if (item.op === 'move') {
      const { id, position, positionId } = item as IFormattedJsonPatchOperation & {
        position?: string;
        positionId?: string;
      };
      if (id) {
        item.from = findComponentPath(templeSchema, id) ?? undefined;
      }
      if (position && positionId && item.from) {
        const positionPath = findComponentPath(templeSchema, positionId);
        if (positionPath) {
          const relativePath = getPositionRelativePath(position, positionId, positionPath, item.from);
          item.relativePath = relativePath;
          item.path = positionPath === '/' ? relativePath : mergePath(positionPath, relativePath);
        }
      }
    }

    // 路径解析需基于前序操作后的 schema，必须使用标准 RFC6902 op
    jsonPatchFormatter.patch(templeSchema, [toStandardPatchOp(item)]);

    return item;
  });
};

/** 将 jsonPatch 操作应用到 baseline，返回新 schema；无法解析 id 的操作会被跳过 */
export function applyJsonPatchOperations(
  baseline: unknown,
  operations: unknown[],
): Record<string, unknown> | null {
  if (!baseline || !Array.isArray(operations) || operations.length === 0) {
    return null;
  }

  const formatted = formatJsonPatch(baseline, operations);
  const standardOperations = formatted
    .filter((op) => op.idToPath)
    .map((op) => toStandardPatchOp(op));

  if (standardOperations.length === 0) {
    return null;
  }

  const target = clonePlainJson(baseline as Record<string, unknown>);
  if (!target) {
    return null;
  }
  jsonPatchFormatter.patch(target, standardOperations);
  return target;
}
