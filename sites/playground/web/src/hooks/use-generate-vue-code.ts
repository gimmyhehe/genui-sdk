import { generateCode as generateVueCode } from '@opentiny/genui-sdk-vue';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';

type IComponentMapItem = {
  componentName: string;
  pkg: string;
  package: string;
  exportName: string;
};

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

export const useExportVueCode = () => {
  const componentsMap = generateComponentsMap(rendererConfig?.materialsList);

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
