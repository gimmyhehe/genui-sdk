<script setup>
import { ref, inject } from 'vue';
import { TinyButton, TinySwitch, TinyPopover, TinyCollapseItem, TinyNotify } from '@opentiny/vue';
import { iconDel, iconEdit, iconPlus, iconEllipsis } from '@opentiny/vue-icon';
import ApiMcpDialog from './ApiMcpDialog.vue';
import { detectOpenApiInputMode, formatOpenApiSourceLabel } from './api-mcp-input-utils';

const playgroundContext = inject('playgroundContext');
const { llmConfig } = playgroundContext;

const IconPlus = iconPlus();
const IconDel = iconDel();
const IconEdit = iconEdit();
const IconEllipsis = iconEllipsis();

const showApiMcpFormDialog = ref(false);
const previewLoading = ref(false);
const confirmLoading = ref(false);
const previewData = ref(null);
const previewStatus = ref('idle');
const previewError = ref('');
const lastParsedOpenApi = ref('');
const lastParsedToolNamePrefix = ref('');

const emptyApiMcpData = () => ({
  name: '',
  openapi: '',
  openapiInputMode: 'url',
  openapiFileName: '',
  index: -1,
});

const apiMcpData = ref(emptyApiMcpData());

function slugifyName(name) {
  const slug = String(name ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return /^[0-9]/.test(slug) ? `_${slug}` : slug;
}

function resolveOpenApiDocument(service) {
  return (service?.openapi ?? '').trim();
}

function resolveOpenApiFileName(service) {
  return service?.openapiFileName ?? '';
}

const invalidatePreview = () => {
  previewData.value = null;
  previewStatus.value = 'idle';
  previewError.value = '';
  lastParsedOpenApi.value = '';
  lastParsedToolNamePrefix.value = '';
};

const closeApiMcpDialog = () => {
  showApiMcpFormDialog.value = false;
  apiMcpData.value = emptyApiMcpData();
  invalidatePreview();
  previewLoading.value = false;
  confirmLoading.value = false;
};

const addApiMcpService = () => {
  apiMcpData.value = emptyApiMcpData();
  invalidatePreview();
  showApiMcpFormDialog.value = true;
};

const editApiMcpService = (service, index) => {
  const openApiDocument = resolveOpenApiDocument(service);
  const openApiFileName = resolveOpenApiFileName(service);
  apiMcpData.value = {
    name: service.name || '',
    openapi: openApiDocument,
    openapiInputMode: detectOpenApiInputMode(openApiDocument, openApiFileName),
    openapiFileName: openApiFileName,
    index,
  };
  previewStatus.value = 'success';
  previewData.value = {
    baseUrl: service.baseUrl || '',
    toolCount: service.toolCount ?? 0,
    toolNames: service.toolNames || [],
    tools: service.tools || [],
  };
  lastParsedOpenApi.value = openApiDocument;
  lastParsedToolNamePrefix.value = service.toolNamePrefix || slugifyName(service.name || '');
  showApiMcpFormDialog.value = true;
};

const onUpdateApiMcpData = (val) => {
  apiMcpData.value = val;
  const openApiDocument = (val.openapi || '').trim();
  const prefix = (val.name || '').trim() ? slugifyName(val.name) : '';
  if (
    lastParsedOpenApi.value !== '' &&
    (openApiDocument !== lastParsedOpenApi.value || prefix !== lastParsedToolNamePrefix.value)
  ) {
    invalidatePreview();
  }
};

const deleteApiMcpService = (service) => {
  const services = [...(llmConfig.apiMcpServices || [])];
  llmConfig.apiMcpServices = services.filter((s) => s.name !== service.name);
};

const updateApiMcpEnabled = (service, enabled) => {
  const services = [...(llmConfig.apiMcpServices || [])];
  llmConfig.apiMcpServices = services.map((s) => (s.name === service.name ? { ...s, enabled } : s));
};

const parseOpenApi = async () => {
  const openApiDocument = (apiMcpData.value.openapi || '').trim();
  const name = (apiMcpData.value.name || '').trim();

  if (!openApiDocument) {
    TinyNotify({
      type: 'warning',
      message: '请提供 OpenAPI 文档（URL、JSON/YAML 或文件）',
      position: 'top-right',
    });
    return false;
  }

  previewLoading.value = true;
  previewStatus.value = 'loading';
  previewError.value = '';

  try {
    const checkApiMcpUrl = import.meta.env.VITE_CHECK_API_MCP_URL;
    const res = await fetch(checkApiMcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openapi: openApiDocument,
        toolNamePrefix: name ? slugifyName(name) : undefined,
      }),
    });
    const data = await res.json();
    if (data.code !== 200) {
      throw new Error(data.message || '解析 OpenAPI 失败');
    }

    previewData.value = data.data;
    previewStatus.value = 'success';
    lastParsedOpenApi.value = openApiDocument;
    lastParsedToolNamePrefix.value = name ? slugifyName(name) : '';
    return true;
  } catch (error) {
    previewStatus.value = 'error';
    previewError.value = error?.message ? `解析 OpenAPI 失败：${error.message}` : '解析 OpenAPI 失败';
    return false;
  } finally {
    previewLoading.value = false;
  }
};

const confirmApiMcp = async () => {
  const { name, openapi, openapiFileName, index } = apiMcpData.value;
  const openApiTrimmed = (openapi || '').trim();
  const nameTrimmed = (name || '').trim();

  if (!nameTrimmed || !openApiTrimmed) {
    TinyNotify({
      type: 'warning',
      message: '请填写名称并提供 OpenAPI 文档',
      position: 'top-right',
    });
    return;
  }

  confirmLoading.value = true;
  try {
    const currentPrefix = slugifyName(nameTrimmed);
    const needsParse =
      !previewData.value ||
      previewStatus.value !== 'success' ||
      openApiTrimmed !== lastParsedOpenApi.value ||
      currentPrefix !== lastParsedToolNamePrefix.value;

    if (needsParse) {
      const parsed = await parseOpenApi();
      if (!parsed) {
        return;
      }
    }

    const services = [...(llmConfig.apiMcpServices || [])];
    const nameCollision = services.some((s, i) => i !== index && (s.name || '').trim() === nameTrimmed);
    if (nameCollision) {
      TinyNotify({
        type: 'warning',
        message: `已存在名为「${nameTrimmed}」的服务，名称不可重复`,
        position: 'top-right',
      });
      return;
    }

    const enabledValue = index > -1 ? (services[index]?.enabled ?? true) : true;
    const nextService = {
      name: nameTrimmed,
      openapi: openApiTrimmed,
      baseUrl: previewData.value.baseUrl,
      toolNamePrefix: slugifyName(nameTrimmed),
      openapiFileName: (openapiFileName || '').trim() || undefined,
      toolCount: previewData.value.toolCount,
      toolNames: previewData.value.toolNames,
      tools: previewData.value.tools || [],
      enabled: enabledValue,
    };

    if (index > -1) {
      services[index] = nextService;
    } else {
      services.push(nextService);
    }

    llmConfig.apiMcpServices = services;
    closeApiMcpDialog();
  } finally {
    confirmLoading.value = false;
  }
};
</script>

<template>
  <tiny-collapse-item name="apiMcp" title="API服务">
    <template #title-right>
      <tiny-button type="text" :icon="IconPlus" @click.stop="addApiMcpService"> </tiny-button>
    </template>
    <div class="mcp-server-list">
      <div
        class="mcp-server-item"
        v-for="(service, index) in llmConfig.apiMcpServices || []"
        :key="service.name"
      >
        <div class="mcp-server-item-header">
          <div class="mcp-server-item-name">{{ service.name }}</div>
          <div>
            <tiny-switch
              :model-value="service.enabled !== false"
              @update:model-value="updateApiMcpEnabled(service, $event)"
              class="mcp-server-item-enabled"
            ></tiny-switch>
            <tiny-popover
              trigger="hover"
              popper-class="mcp-server-item-actions-popover"
              :visible-arrow="false"
              :append-to-body="false"
            >
              <template #default>
                <div class="mcp-server-item-actions">
                  <div @click="editApiMcpService(service, index)">
                    <component :is="IconEdit" />
                    <span>编辑</span>
                  </div>
                  <div @click="deleteApiMcpService(service)">
                    <component :is="IconDel" />
                    <span>移除</span>
                  </div>
                </div>
              </template>
              <template #reference>
                <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
              </template>
            </tiny-popover>
          </div>
        </div>
        <div class="mcp-server-item-description">{{ formatOpenApiSourceLabel(service) }}</div>
      </div>
    </div>
    <div v-if="!llmConfig.apiMcpServices || llmConfig.apiMcpServices.length === 0" class="mcp-server-list-empty">
      <div class="mcp-server-item-empty">
        <div class="mcp-server-item-empty-icon">
          点击右上角
          <component :is="IconPlus" class="mcp-server-item-empty-plus-icon" />
          添加 API服务
        </div>
      </div>
    </div>
    <ApiMcpDialog
      :visible="showApiMcpFormDialog"
      :api-mcp-data="apiMcpData"
      :preview-data="previewData"
      :preview-status="previewStatus"
      :preview-error="previewError"
      :preview-loading="previewLoading"
      :confirm-loading="confirmLoading"
      @update:visible="
        (val) => {
          if (!val) closeApiMcpDialog();
          else showApiMcpFormDialog = val;
        }
      "
      @update:apiMcpData="onUpdateApiMcpData"
      @parseOpenApi="parseOpenApi"
      @confirmApiMcp="confirmApiMcp"
    />
  </tiny-collapse-item>
</template>

<style scoped lang="less">
.mcp-server-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .mcp-server-item {
    border: none;
    border-radius: 6px;
    padding: 10px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(246, 246, 246, 1);
    }

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    &-name {
      font-size: 14px;
      font-weight: 600;
      color: #191919;
    }

    &-description {
      font-size: 12px;
      color: #999;
      overflow-wrap: break-word;
      margin-top: 4px;
    }

    &-enabled {
      margin-left: 4px;
    }
  }
}

.mcp-server-list-empty {
  margin-top: 12px;
}

.mcp-server-item-empty {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.mcp-server-item-empty-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  letter-spacing: 0.2px;
}

.mcp-server-item-empty-plus-icon {
  width: 12px;
  height: 12px;
  color: #595959;
}

:deep(.mcp-server-item-actions-popover) {
  padding: 0;
  border: none;
}

.mcp-server-item-actions {
  & > div {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 16px;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}
</style>
