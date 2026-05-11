import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue';
import {
  applyMaterialDefaultsToNode as applyMaterialDefaultsToNodeCore,
  applyMaterialDefaultsToSchema as applyMaterialDefaultsToSchemaCore,
  buildMaterialDefaultValueRegistry,
  type MaterialDefaultValueRegistry,
} from '@opentiny/genui-sdk-core';

// TODO: 添加上默认值，可能会导致渲染与预期不符，需要排查逐步开发组件
const componentMatcher = (componentName: string) => componentName.startsWith('TinyHuicharts') || ['TinySelect'].includes(componentName);

const materialDefaultValueRegistry = buildMaterialDefaultValueRegistry(rendererConfig.materialsList, {
  includeComponent: componentMatcher,
});

export const applyMaterialDefaultsToSchema = (
  schema: Record<string, any>,
  registry: MaterialDefaultValueRegistry = materialDefaultValueRegistry,
) => applyMaterialDefaultsToSchemaCore(schema, registry);

export const applyMaterialDefaultsToNode = (
  node: Record<string, any>,
  registry: MaterialDefaultValueRegistry = materialDefaultValueRegistry,
) => applyMaterialDefaultsToNodeCore(node, registry);
