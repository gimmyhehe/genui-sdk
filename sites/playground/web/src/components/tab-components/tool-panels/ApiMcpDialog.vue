<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  TinyButton,
  TinyButtonGroup,
  TinyDialogBox,
  TinyForm,
  TinyFormItem,
  TinyInput,
  TinyNotify,
} from '@opentiny/vue';
import {
  readOpenApiFile,
  type OpenApiInputMode,
} from './api-mcp-input-utils';

export interface ApiMcpFormData {
  name: string;
  openapi: string;
  openapiInputMode: OpenApiInputMode;
  openapiFileName?: string;
  index: number;
}

export interface ApiMcpPreviewTool {
  name: string;
  summary?: string;
  method: string;
  path: string;
}

export interface ApiMcpPreviewData {
  baseUrl: string;
  toolCount: number;
  toolNames: string[];
  tools?: ApiMcpPreviewTool[];
}

const props = defineProps<{
  visible: boolean;
  apiMcpData: ApiMcpFormData;
  previewData: ApiMcpPreviewData | null;
  previewStatus: 'idle' | 'loading' | 'success' | 'error';
  previewError: string;
  previewLoading: boolean;
  confirmLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:apiMcpData', value: ApiMcpFormData): void;
  (e: 'parseOpenApi'): void;
  (e: 'confirmApiMcp'): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

const modeButtonData = [
  { text: 'URL', value: 'url' },
  { text: '文档内容', value: 'inline' },
  { text: '文件', value: 'file' },
];

const handleClose = () => {
  emit('update:visible', false);
};

const patchFormData = (patch: Partial<ApiMcpFormData>) => {
  emit('update:apiMcpData', {
    ...props.apiMcpData,
    ...patch,
  });
};

const updateField = (field: keyof ApiMcpFormData, value: string) => {
  patchFormData({ [field]: value } as Partial<ApiMcpFormData>);
};

const onModeChange = (mode: OpenApiInputMode) => {
  if (mode === props.apiMcpData.openapiInputMode) {
    return;
  }
  patchFormData({
    openapiInputMode: mode,
    openapi: '',
    openapiFileName: '',
  });
};

const openFilePicker = () => {
  fileInputRef.value?.click();
};

const applyOpenApiFile = async (file: File) => {
  try {
    const content = await readOpenApiFile(file);
    patchFormData({
      openapi: content,
      openapiFileName: file.name,
      openapiInputMode: 'file',
    });
  } catch (error) {
    TinyNotify({
      type: 'error',
      message: error instanceof Error ? error.message : '读取文件失败',
      position: 'top-right',
    });
  }
};

const onFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    await applyOpenApiFile(file);
  }
  input.value = '';
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await applyOpenApiFile(file);
  }
};

const previewTools = computed<ApiMcpPreviewTool[]>(() => {
  const data = props.previewData;
  if (!data) {
    return [];
  }
  if (data.tools?.length) {
    return data.tools;
  }
  return (data.toolNames || []).map((name) => ({
    name,
    method: '',
    path: '',
  }));
});

const formatToolSummary = (tool: ApiMcpPreviewTool) => {
  return tool.summary?.trim() || '无描述';
};
</script>

<template>
  <tiny-dialog-box
    :visible="visible"
    :title="apiMcpData.index > -1 ? '编辑 API服务' : '添加 API服务'"
    width="600px"
    height="480px"
    class="api-mcp-dialog"
    :append-to-body="true"
    @update:visible="emit('update:visible', $event)"
    @close="handleClose"
  >
    <div class="api-mcp-dialog-body">
    <tiny-form :model="apiMcpData" label-width="140px" label-position="left" class="api-mcp-dialog-form">
      <tiny-form-item label="OpenAPI 文档" required>
        <div class="api-mcp-input-section">
          <tiny-button-group
            size="small"
            :data="modeButtonData"
            :model-value="apiMcpData.openapiInputMode"
            @update:model-value="onModeChange($event as OpenApiInputMode)"
          />
          <div v-if="apiMcpData.openapiInputMode === 'url'" class="api-mcp-mode-panel">
            <tiny-input
              :model-value="apiMcpData.openapi"
              placeholder="https://example.com/openapi.json"
              @update:model-value="updateField('openapi', $event)"
            />
          </div>
          <div v-else-if="apiMcpData.openapiInputMode === 'inline'" class="api-mcp-mode-panel">
            <tiny-input
              type="textarea"
              :model-value="apiMcpData.openapi"
              :rows="8"
              placeholder="粘贴 OpenAPI JSON 或 YAML 文档"
              class="api-mcp-inline-input"
              @update:model-value="updateField('openapi', $event)"
            />
          </div>
          <div v-else class="api-mcp-mode-panel">
            <div
              class="api-mcp-dropzone"
              :class="{ 'api-mcp-dropzone--active': isDragOver }"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
              @click="openFilePicker"
            >
              <div class="api-mcp-dropzone__title">拖入 OpenAPI 文件，或点击选择</div>
              <div class="api-mcp-dropzone__hint">支持 .json、.yaml、.yml</div>
              <div v-if="apiMcpData.openapiFileName" class="api-mcp-dropzone__file">
                已加载：{{ apiMcpData.openapiFileName }}
              </div>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              class="api-mcp-file-input"
              accept=".json,.yaml,.yml,application/json,text/yaml"
              @change="onFileInputChange"
            />
          </div>
          <div class="api-mcp-parse-row">
            <tiny-button type="primary" :loading="previewLoading" @click="emit('parseOpenApi')">
              {{ previewStatus === 'error' ? '重试' : '解析 OpenAPI' }}
            </tiny-button>
          </div>
        </div>
      </tiny-form-item>
      <tiny-form-item label="名称" prop="name" required>
        <tiny-input
          :model-value="apiMcpData.name"
          placeholder="服务名称（用于界面展示）"
          @update:model-value="updateField('name', $event)"
        />
      </tiny-form-item>
    </tiny-form>
      <div v-if="previewStatus === 'loading'" class="api-mcp-hint api-mcp-hint--info">
        正在解析 OpenAPI 文档...
      </div>
      <div v-if="previewStatus === 'error'" class="api-mcp-hint api-mcp-hint--error">
        {{ previewError }}
      </div>
      <div v-if="previewStatus === 'success' && previewData" class="api-mcp-preview">
        <div class="api-mcp-preview__badge">OpenAPI 已解析</div>
        <div class="api-mcp-preview__main">
          <div class="api-mcp-preview__block">
            <span class="api-mcp-preview__block-label">Base URL</span>
            <div class="api-mcp-preview__url">{{ previewData.baseUrl }}</div>
          </div>
          <div class="api-mcp-preview__block">
            <span class="api-mcp-preview__block-label">工具数量</span>
            <div class="api-mcp-preview__count">{{ previewData.toolCount }} 个</div>
          </div>
          <div class="api-mcp-preview__block">
            <span class="api-mcp-preview__block-label">工具列表</span>
            <ul v-if="previewTools.length" class="api-mcp-preview__tool-list">
              <li v-for="(tool, i) in previewTools" :key="i" class="api-mcp-preview__tool-item">
                <div class="api-mcp-preview__tool-name">{{ tool.name }}</div>
                <div class="api-mcp-preview__tool-desc">{{ formatToolSummary(tool) }}</div>
              </li>
            </ul>
            <div v-else class="api-mcp-preview__tool-empty">未解析到可用 API 操作</div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <tiny-button type="primary" :loading="confirmLoading" @click="emit('confirmApiMcp')">
        确认
      </tiny-button>
    </template>
  </tiny-dialog-box>
</template>

<style scoped lang="less">
.api-mcp-dialog {
  :deep(.tiny-dialog-box__body) {
    overflow: hidden;
  }
}

.api-mcp-dialog-body {
  height: 360px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.api-mcp-dialog-form {
  :deep(.tiny-form-item__label) {
    line-height: 1.35;
    white-space: normal;
    word-break: break-word;
  }
}

.api-mcp-input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.api-mcp-mode-panel {
  width: 100%;
}

.api-mcp-inline-input {
  :deep(textarea) {
    height: 160px !important;
    min-height: 160px !important;
    max-height: 160px !important;
    resize: none;
    overflow-y: auto;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  }
}

.api-mcp-dropzone {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  height: 120px;
  min-height: 120px;
  max-height: 120px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &--active,
  &:hover {
    border-color: var(--ti-base-color-brand-6, #1890ff);
    background: rgba(24, 144, 255, 0.04);
  }

  &__title {
    font-size: 13px;
    color: #595959;
  }

  &__hint {
    font-size: 12px;
    color: #8c8c8c;
  }

  &__file {
    margin-top: 4px;
    font-size: 12px;
    color: #1476ff;
    word-break: break-all;
    text-align: center;
  }
}

.api-mcp-file-input {
  display: none;
}

.api-mcp-parse-row {
  display: flex;
  justify-content: flex-end;
}

.api-mcp-preview {
  position: relative;
  margin-top: 16px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
  background: linear-gradient(180deg, #fcfcfd 0%, #f7f8fa 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  overflow: hidden;

  &__badge {
    display: inline-block;
    margin: 12px 14px 0;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #1476ff;
    background: rgba(20, 118, 255, 0.08);
    border-radius: 4px;
  }

  &__main {
    padding: 10px 14px 14px;
  }

  &__block {
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__block-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #8c8c8c;
  }

  &__url,
  &__count {
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-all;
    color: #262626;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
  }

  &__url {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }

  &__tool-list {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 160px;
    overflow-y: auto;
  }

  &__tool-item {
    padding: 8px 10px;
    margin-bottom: 4px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__tool-name {
    font-size: 12px;
    line-height: 1.45;
    word-break: break-word;
    color: #262626;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-weight: 600;
  }

  &__tool-desc {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-word;
    color: #595959;
  }

  &__tool-empty {
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #8c8c8c;
    background: #fafafa;
    border: 1px dashed #e0e0e0;
    border-radius: 6px;
  }
}

.api-mcp-hint {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;

  &--info {
    background-color: #e6f4ff;
    color: #0958d9;
    border: 1px solid #91caff;
  }

  &--error {
    background-color: #fff1f0;
    color: #cf1322;
    border: 1px solid #ffa39e;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
}
</style>
