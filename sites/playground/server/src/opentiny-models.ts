interface OpenTinyModel {
  id: string;
  provider: string;
  type: string;
  display_name: string;
  capabilities?: {
    vision?: boolean;
    fileUpload?: {
      supportDirectImage?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface OpenTinyModelsResponse {
  models: OpenTinyModel[];
  [key: string]: any;
}

/**
 * 将 OpenTiny 模型列表转换为 provider-models.json 使用的结构
 * 结构示例可参考 opentiny-models.json
 */
export function convertOpenTinyToProviderModelsData(resp: OpenTinyModelsResponse): Record<string, any> {
  const models = Array.isArray(resp?.models) ? resp.models : [];

  const convertedModels = models.map((model) => {
    const { display_name, id, type, capabilities, provider } = model;
    const supportImage =
      type === 'vision' || capabilities?.vision === true || capabilities?.fileUpload?.supportDirectImage === true;

    const modelName = display_name && provider ? `${provider}_${display_name}` : id;
    const modelData: any = {
      name: modelName,
      id,
    };

    if (supportImage) {
      modelData.features = { supportImage: true };
    }

    return modelData;
  });

  // 为了与现有 opentiny-models.json 保持一致，统一放在 deepseek 提供商下
  return {
    dynamic: {
      name: 'deepseek',
      apiKeyEnvName: 'DYNAMIC_API_KEY',
      baseUrlEnvName: 'DYNAMIC_BASE_URL',
      models: convertedModels,  
    },
  };
}

/**
 * 从动态模型地址拉取模型并转换为 provider-models.json 一致的数据结构
 */
export async function fetchOpenTinyProviderModelsData(): Promise<Record<string, any>> {
  const url = process.env.DYNAMIC_MODELS_URL;

  if (!url) {
    return null;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Failed to fetch dynamic models:', res.statusText);
      return null;
    }
    const data = (await res.json()) as OpenTinyModelsResponse;

    return convertOpenTinyToProviderModelsData(data);
  } catch (err) {
    console.error('Failed to fetch dynamic models:', err);

    return null;
  }
}
