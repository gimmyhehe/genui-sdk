import { generateCode as generateVueCode } from '@opentiny/genui-sdk-vue';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';

type IComponentMapItem = {
  componentName: string;
  pkg: string;
  package: string;
  exportName: string;
};

/**
 * 从 renderer materials 中提取并去重组件映射，用于代码生成阶段解析依赖。
 * @param materialsList 渲染器物料列表。
 * @returns 生成代码所需的组件映射表。
 */
const generateComponentsMap = (materialsList: any): IComponentMapItem[] => {
  if (!Array.isArray(materialsList)) {
    return [];
  }

  const deduped = new Map<string, IComponentMapItem>();
  materialsList.forEach((material: any) => {
    const components = material?.data?.materials?.components;
    if (!Array.isArray(components)) {
      return;
    }
    components.forEach((item: any) => {
      const componentName = item?.component || item?.npm?.exportName;
      const pkg = item?.npm?.package;
      if (!componentName || !pkg) {
        return;
      }
      deduped.set(componentName, {
        componentName,
        pkg,
        package: pkg,
        exportName: item?.npm?.exportName || componentName,
      });
    });
  });

  return [...deduped.values()];
};

/**
 * 将文本内容下载为本地文件（默认补齐 .vue 后缀）。
 * @param filename 目标文件名。
 * @param text 文件内容。
 */
const downloadTextFile = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = /\.vue$/i.test(filename) ? filename : `${filename}.vue`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * 提供 schema -> Vue 源码导出能力。
 * @returns 导出 Vue 代码的方法集合。
 */
export const useExportVueCode = () => {
  const componentsMap = generateComponentsMap(rendererConfig?.materialsList);

  /**
   * 将当前 schema 生成为 Vue 单文件组件并下载到本地。
   * @param schema 页面 schema。
   */
  const exportVueCode = async (schema: any): Promise<void> => {
    const { panelValue: code, panelName: fileName, errors } = await generateVueCode({
      pageInfo: { schema },
      componentsMap,
      formatWithPrettier: true,
    });

    if (errors?.length) {
      console.error('生成代码校验出错：', errors);
    }

    downloadTextFile(fileName, code);
  };

  return {
    exportVueCode,
  };
};
