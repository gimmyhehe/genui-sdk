# @opentiny/genui-sdk-materials-vue-element-plus

基于 [Element Plus](https://element-plus.org/) 的 GenUI Vue 物料包，用于 schema 驱动的页面生成与渲染。

## 安装

```bash
npm install @opentiny/genui-sdk-materials-vue-element-plus element-plus vue
```

需同时安装 peer 依赖：`vue`、`element-plus`。

## 快速上手

### 前端渲染

在应用入口引入 Element Plus 样式，并通过 `ConfigProvider` 注入物料：

```ts
import 'element-plus/dist/index.css';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-element-plus/materials';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

### 生成 LLM Prompt（服务端）

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

const systemPrompt = genPrompt('Vue', materialsMeta, customConfig);
```

`materialsMeta.wrapperComponent` 默认为 `ElCard`。

## API

| 导出路径 | 导出内容 | 说明 |
|---------|---------|------|
| `@opentiny/genui-sdk-materials-vue-element-plus` | `materials`、`materialsMeta` | 统一入口 |
| `.../materials` | `materials` | 供 `ConfigProvider` 注入 schema 渲染器 |
| `.../meta` | `materialsMeta` | 供 `genPrompt()` / 服务端拼 system prompt |

### `materials`

组件注册表，包含 Element Plus 组件映射，供渲染器按 `componentName` 解析节点。

### `materialsMeta`

物料元数据，包含：

- `materials`：组件/区块/snippets 协议描述
- `wrapperComponent`：默认包裹组件（`ElCard`）
- `whiteList`：LLM 可用的 `componentName` 白名单
- `examples`：Prompt 示例 schema（form / info / table）
- `rules`：额外约束规则

组件库：`element-plus`。

## 更多

包内开发、本地 demo 与扩展组件，见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
