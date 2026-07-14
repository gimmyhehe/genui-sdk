# 开发指南

面向本物料包的本地开发与扩展说明。使用者请先看 [README.md](./README.md)。

## 包结构

```text
vue-element-plus/
├── src/
│   ├── index.ts                 # 统一入口
│   ├── materials/
│   │   ├── index.ts             # 导出 materials
│   │   ├── materials.ts         # 物料注册表
│   │   └── components/
│   │       ├── index.ts
│   │       └── components.ts    # Element Plus 组件映射
│   └── meta/
│       ├── index.ts             # 导出 materialsMeta
│       ├── meta.ts              # 物料元数据
│       ├── white-list.ts        # LLM 可用 componentName 白名单
│       ├── example-schema.ts    # Prompt 示例 schema
│       ├── examples/            # 示例 JSON
│       └── materials/
│           └── bundle.json      # Element Plus 基础物料
├── test/
│   ├── mock/                    # JSON demo（form-binding、table、info-card、tabs）
│   ├── App.vue                  # 本地 tab 切换渲染
│   └── schema-context.ts        # demo 测试用 schema 解析工具
├── vite.config.ts               # 物料包构建配置
├── vite.config.test.ts          # 本地 demo 开发配置
└── __tests__/
    └── schema-demos.test.ts     # 基于 mock json 的自动化测试
```

## 构建与验证

```bash
# 构建
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus build

# 本地 JSON Demo（test/mock/，tab 切换渲染）
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus dev

# 自动化测试
pnpm -F @opentiny/genui-sdk-materials-vue-element-plus test
```

新增 demo：在 `test/mock/` 增加 json 并在 `test/mock/index.ts` 注册即可。

## 开发态路径别名（可选）

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
    "@opentiny/genui-sdk-materials-vue-element-plus/meta": [
      "../../../packages/materials/vue-element-plus/src/meta/index.ts"
    ]
  }
}
```

## 扩展更多组件

1. 在 `meta/materials/bundle.json` 增加组件 schema 描述
2. 在 `meta/white-list.ts` 加入 `componentName`
3. 在 `materials/components/components.ts` 中注册对应 `element-plus` 导出
