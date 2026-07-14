# @opentiny/genui-sdk-core

GenUI SDK 核心能力包：协议类型、Prompt 生成、流式 Schema 提取、Delta 补丁、JSON 修复等，供 Vue / Angular / Server 等上层包依赖。

## 安装

```bash
npm install @opentiny/genui-sdk-core
# 或
pnpm add @opentiny/genui-sdk-core
```

## 模块概览

| 模块 | 主要导出 |
|------|----------|
| `protocols` | `IChatMessage`、`CardSchema`、`IMaterials` 等协议与 Zod Schema |
| `material` | `IMaterials`、`IMaterialsMeta`、`buildMaterialDefaultValueMap` |
| `prompt-generator` | `genPrompt`、`genRootSchema`、`genJsonSchema` |
| `stream-pattern-extractor` | `PatternExtractor`、`SchemaJsonPattern`、`getPartialStartRegString` |
| `delta-patcher` | `DeltaPatcher` |
| `delta-json-path-selector` | `matchJsonPath`、`jsonSelectorMatcher` |
| `repair-json` | `repairJson`、`safeJsonParse` |

## 使用示例

```ts
import {
  genPrompt,
  PatternExtractor,
  DeltaPatcher,
  repairJson,
  type IChatMessage,
} from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const prompt = genPrompt('Vue', materialsMeta, customConfig);
const { state, value } = repairJson(partialJson);
```

## 文档

- [GenUI SDK 官网](https://opentiny.design/genui-sdk)
- [快速开始](https://docs.opentiny.design/genui-sdk/guide/quick-start)
