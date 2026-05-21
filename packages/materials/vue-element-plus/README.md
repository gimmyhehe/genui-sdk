# @opentiny/genui-sdk-materials-vue-element-plus

基于 [Element Plus](https://element-plus.org/) 的 GenUI Vue 物料包，结构与 `@opentiny/genui-sdk-materials-vue-opentiny-vue` 对齐。

## 包结构

```
vue-element-plus/
├── src/
│   ├── index.ts                 # 统一入口
│   ├── extend-renderer.ts       # 注册 Element Plus 到 schema Mapper
│   └── render-config/
│       ├── bundle.json          # 核心组件物料（ElInput、ElTable 等）
│       ├── builtin.json         # 内置节点（div、Text、Slot 等）
│       ├── extend.json          # 扩展组件（ElCard、ElRow 等）
│       ├── chart.json           # 图表占位（当前为空）
│       ├── white-list.ts        # LLM 可用 componentName 白名单
│       ├── example-schema.ts    # Prompt 示例 schema
│       └── merge.ts             # 合并为 rendererConfig
```

## 导出子路径

| 路径 | 用途 |
|------|------|
| `@opentiny/genui-sdk-materials-vue-element-plus` | 统一入口 |
| `.../render-config` | `rendererConfig`，供 `genPrompt()` / 服务端拼 system prompt |
| `.../extend-renderer` | `extendMapper()`，供前端 schema 渲染器注册组件 |

## 使用方式

### 1. 构建

```bash
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus build
```

### 2. LLM Prompt（服务端）

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-element-plus/render-config';

const systemPrompt = genPrompt(rendererConfig, customConfig);
```

`rendererConfig.wrapperComponent` 默认为 `ElCard`（对应 OpenTiny 物料包的 `TinyCard`）。

### 3. 前端渲染（需要 schema 渲染器）

在应用入口引入 Element Plus 样式，并在渲染前扩展 Mapper：

```ts
import 'element-plus/dist/index.css';
import { extendMapper } from '@opentiny/genui-sdk-materials-vue-element-plus/extend-renderer';
import { Mapper } from '@opentiny/tiny-schema-renderer';

extendMapper(Mapper);
```

在 `SchemaCardRenderer` 中可将原来的 `vue-opentiny-vue/extend-renderer` 替换为本包（或通过配置注入，避免硬编码）。

### 4. 开发态路径别名（可选）

在 `tsconfig` 中增加：

```json
{
  "paths": {
    "@opentiny/genui-sdk-materials-vue-element-plus": [
      "../../../packages/materials/vue-element-plus/src/index.ts"
    ],
    "@opentiny/genui-sdk-materials-vue-element-plus/extend-renderer": [
      "../../../packages/materials/vue-element-plus/src/extend-renderer.ts"
    ],
    "@opentiny/genui-sdk-materials-vue-element-plus/render-config": [
      "../../../packages/materials/vue-element-plus/src/render-config/index.ts"
    ]
  }
}
```

## 与 vue-opentiny-vue 的差异

- 组件库：`element-plus`（非 `@opentiny/vue-*`）
- 卡片包裹：`ElCard`（非 `TinyCard`）
- `bundle.json` 仅保留 Element Plus 核心表单/表格物料
- 无 OpenTiny 图表物料（`chart.json` 为空）

## 扩展更多组件

1. 在 `bundle.json` 或 `extend.json` 增加组件 schema 描述
2. 在 `white-list.ts` 加入 `componentName`
3. 在 `extend-renderer.ts` 的 `extendMapper` 中注册对应 `element-plus` 导出
