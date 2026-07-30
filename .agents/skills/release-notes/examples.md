# Release Notes 示例

以下为 `v1.2.0`（对比 `v1.1.2`）的格式参考。

```markdown
# Genui SDK v1.2.0 Release Notes

## 🚀 Highlights

- **Conversation history** - import/export history records (#142, #147) with time grouping and batch export (#157).
- **Skills & agents** - added skills support (#150) and agents-as-tools (#111), with the template schema moved into user messages (#135).
- **JSON patch streaming** - added jsonPath streamable patch support (#141, #146) and enforced strict JSON output for schemaJson (#158).
- **Renderer** - split components into multiple chunks (#139) and added the isJsonComplete option (#146).
- **DeepSeek** - patched the ai-sdk deepseek provider for missing reasoning_content in deepseek-v4-flash/pro (#153).
- **Benchmarks** - added a benchmarks package (#112).

---

## ✨ Features

**Components**
- feat: add isJsonComplete option by @rhlin in https://github.com/opentiny/genui-sdk/pull/146 - 06b01d8856244cd0991c95c8426d245566188f3c
- feat(genui-sdk-vue): split components into multiple chunks by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/139

**Playground**
- feat: add new models and support multiple keys by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/128
- feat(playground): move the current template schema to user messages, add assistant message to conversation context by @rhlin in https://github.com/opentiny/genui-sdk/pull/135
- feat(playground): agents as tools by @yy-wow in https://github.com/opentiny/genui-sdk/pull/111
- feat(playground): add history import and export functionality by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/142
- feat(playground): add skills support by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/150
- feat(playground): add extraBody and split model into thinking/no-thinking mode by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/155
- feat(playground): history: add time grouping and batch export for selected records by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/157
- feat(genui-template): implement conversation import/export by @yy-wow in https://github.com/opentiny/genui-sdk/pull/147
- feat: update template styles and mobile styles by @yy-wow in https://github.com/opentiny/genui-sdk/pull/127
- feat: json patch zod by @yy-wow in https://github.com/opentiny/genui-sdk/pull/141
- feat: add jsonPath streamable patch support by @rhlin in https://github.com/opentiny/genui-sdk/pull/146 - 661655e4fcbb5ebfecc426a3f4d9dd87e32d8bf2

---

## 🐛 Bug Fixes

**Components**
- fix: resolve getCustomSetting not defined error by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/151
- fix: restore tiny-schema-render error catch feature by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/154
- fix(genui-sdk-vue): support data lines without space after 'data:' by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/156
- fix(tiny-schema-renderer): fix error where loop children cannot read scope by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/159
- fix(core): enforce strict JSON format for schemaJson output by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/158
- fix(core): fix structuredClone error when using ref JSON and isJsonComplete is false by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/164
- fix opentiny ng checkbox stream rendering & TiDateRange placeholder description by @rhlin in https://github.com/opentiny/genui-sdk/pull/160

**Playground**
- fix: tools css by @yy-wow in https://github.com/opentiny/genui-sdk/pull/140
- fix(playground/server): patch ai-sdk deepseek provider for missing reasoning_content in deepseek-v4-flash/pro by @rhlin in https://github.com/opentiny/genui-sdk/pull/153
- fix(playground): pin tool call options to tools tab bottom with independent scroll by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/168
- fix: template PC rendering by @yy-wow in https://github.com/opentiny/genui-sdk/pull/134
- fix(genui-template): update title by @yy-wow in https://github.com/opentiny/genui-sdk/pull/136
- fix(genui-template): update styles by @yy-wow in https://github.com/opentiny/genui-sdk/pull/152
- fix(chat): update customExample by @yy-wow in https://github.com/opentiny/genui-sdk/pull/144

---

## ♻️ Refactor

**Components**
- refactor: move think wrap from core to chat by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/148

**Playground**
- refactor(playground-template): unify template list UI with history session using TrHistory by @yy-wow in https://github.com/opentiny/genui-sdk/pull/171

---

## 🔧 Other Changes

**Test**
- add repair json test cases by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/169

**Build**
- ci: add VITE_CHAT_TEMPLATE_URL environment in GitHub Pages deployment action by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/133
- build(playground): exclude monaco-editor from dependency optimization to fix file-not-found warning by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/145
- build(genui-sdk-angular): fix build DTS bundle for genui-sdk-core and its dependencies' DTS by @rhlin in https://github.com/opentiny/genui-sdk/pull/167

**Docs**
- docs: update docs for chunk splitting by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/161
- docs: update playground link in README by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/166
- docs: add isJsonComplete docs by @rhlin in https://github.com/opentiny/genui-sdk/pull/146 - 946b06b99f225239a6d9f188f89d63e2702f3e50

**Site**
- fix(homepage): fix video paths for "Order Milk Tea" and "Search Ticket" by @lhuans in https://github.com/opentiny/genui-sdk/pull/163
- fix(homepage): add missing logo svg by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/170

**Benchmarks**
- feat: benchmarks by @yy-wow in https://github.com/opentiny/genui-sdk/pull/112

---

**Full Changelog**: https://github.com/opentiny/genui-sdk/compare/v1.1.2...v1.2.0
```

> 注：v1.2.0 无首次贡献者，`## 🎉 New Contributors` 章节省略。有首次贡献者时，于 `## 🔧 Other Changes` 之后、`**Full Changelog**` 之前插入该章节，每行格式为 `- @{login} made their first contribution in https://github.com/opentiny/genui-sdk/pull/{number}`。
