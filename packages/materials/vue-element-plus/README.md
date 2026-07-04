# @opentiny/genui-sdk-materials-vue-element-plus

基于 [Element Plus](https://element-plus.org/) 的 GenUI Vue 物料包。

## 包结构

```
vue-element-plus/
├── src/
│   ├── index.ts                 # 统一入口
│   ├── materials/
│   │   ├── index.ts             # 导出 materials
│   │   ├── materials.ts         # 物料注册表
│   │   └── components/
│   │       ├── index.ts
│   │       └── components.ts    # Element Plus 组件映射
│   └── render-config/
│       ├── bundle.json          # 核心组件物料（ElInput、ElTable 等）
│       ├── builtin.json         # 内置节点（div、Text、Slot 等）
│       ├── extend.json          # 扩展组件（ElCard、ElRow 等）
│       ├── white-list.ts        # LLM 可用 componentName 白名单
│       ├── example-schema.ts    # Prompt 示例 schema
│       └── merge.ts             # 合并为 rendererConfig
├── test/
│   ├── mock/                    # JSON demo（form-binding、table、info-card、tabs）
│   ├── App.vue                  # 本地 tab 切换渲染
│   └── schema-context.ts        # demo 测试用 schema 解析工具
└── __tests__/
    └── schema-demos.test.ts     # 基于 mock json 的自动化测试
```

## 导出子路径

| 路径 | 用途 |
|------|------|
| `@opentiny/genui-sdk-materials-vue-element-plus` | 统一入口 |
| `.../render-config` | `rendererConfig`，供 `genPrompt()` / 服务端拼 system prompt |
| `.../materials` | `materials`，供 `ConfigProvider` 注入 schema 渲染器 |

## 使用方式

### 1. 构建

```bash
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus build
```

### 2. 本地 JSON Demo 验证

可在 `test/mock/` 维护多个 JSON demo，通过 tab 切换渲染：

```bash
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus dev
```

### 3. 自动化测试

基于 JSON demo 跑 schema 解析与表格插槽作用域测试：

```bash
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus test
```

新增 demo：在 `test/mock/` 增加 json 并在 `test/mock/index.ts` 注册即可。

### 4. LLM Prompt（服务端）

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-element-plus/render-config';

const systemPrompt = genPrompt(rendererConfig, customConfig);
```

`rendererConfig.wrapperComponent` 默认为 `ElCard`。

### 5. 前端渲染

在应用入口引入 Element Plus 样式，并通过 `ConfigProvider` 注入物料：

```ts
import 'element-plus/dist/index.css';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-element-plus/materials';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-element-plus';
```

```vue
<GenuiConfigProvider :materials="materials" :rendererConfig="rendererConfig">
  <GenuiChat />
</GenuiConfigProvider>
```

### 6. 开发态路径别名（可选）

在 `tsconfig` 中增加：

```json
{
  "paths": {
    "@opentiny/genui-sdk-materials-vue-element-plus": [
      "../../../packages/materials/vue-element-plus/src/index.ts"
    ],
    "@opentiny/genui-sdk-materials-vue-element-plus/materials": [
      "../../../packages/materials/vue-element-plus/src/materials/index.ts"
    ],
    "@opentiny/genui-sdk-materials-vue-element-plus/render-config": [
      "../../../packages/materials/vue-element-plus/src/render-config/index.ts"
    ]
  }
}
```

## 说明

- 组件库：`element-plus`
- 默认包裹组件：`ElCard`
- `bundle.json` 包含 Element Plus 核心表单/表格物料

## 扩展更多组件

1. 在 `bundle.json` 或 `extend.json` 增加组件 schema 描述
2. 在 `white-list.ts` 加入 `componentName`
3. 在 `materials/components/components.ts` 中注册对应 `element-plus` 导出
