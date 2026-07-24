# Genui SDK v1.3.0-alpha.4 Release Notes

## ✨ Features

**Components**
- feat: decouple materials by @yy-wow in https://github.com/opentiny/genui-sdk/pull/125
- feat: add apply default props by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/149
- feat: add new vue-element-plus package by @lhuans in https://github.com/opentiny/genui-sdk/pull/174
- feat: defer lifeCycles until schema streaming is complete by @yy-wow in https://github.com/opentiny/genui-sdk/pull/182
- feat: add refs feature and form validation demo by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/183
- feat: add returns and async support to custom actions by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/184
- feat(core): add explicit Zod schema for lifeCycles hooks by @yy-wow in https://github.com/opentiny/genui-sdk/pull/194
- feat(genui-sdk-angular): add default props apply to Angular renderer by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/196
- feat(ng-renderer): add page onMounted/onUnmounted lifecycle support by @yy-wow in https://github.com/opentiny/genui-sdk/pull/197
- feat: add prompt variants by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/202
- feat(genui-sdk-vue): add legacy components by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/209
- feat(genui-sdk-vue): support materials value changes by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/214
- feat(genui-sdk-angular): add legacy component and update docs by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/215

**Playground**
- feat(playground): add OpenAPI-to-AI-SDK tools pipeline with service configuration UI by @gargameljyh in https://github.com/opentiny/genui-sdk/pull/175
- feat(playground): implement language switcher and add English translations by @lhuans in https://github.com/opentiny/genui-sdk/pull/176
- feat(playground): enhance chat template by adding extra body options by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/177
- feat(playground/template): add schema manual editing and version history panel by @yy-wow in https://github.com/opentiny/genui-sdk/pull/185
- feat(playground): add support for A2A protocol v1.0 by @yy-wow in https://github.com/opentiny/genui-sdk/pull/187
- feat(playground): improve i18n and persist locale settings by @lhuans in https://github.com/opentiny/genui-sdk/pull/192
- feat(playground/server): add new MaaS models by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/205
- feat(playground): allow mixin renderer by @rhlin in https://github.com/opentiny/genui-sdk/pull/208

---

## 🐛 Bug Fixes

**Components**
- fix: replace chart components with HuiCharts and apply default props by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/94
- fix(genui-sdk-vue): set isJsonComplete default value to true by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/180
- fix(genui-sdk-vue): optimize notification event payload and tool call result by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/190
- fix: remove unused defaultValue by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/203
- fix(genui-sdk-vue): move inject tokens to shared folder and export from ConfigProvider by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/211
- fix(genui-sdk-angular): apply default properties in attribute parsing by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/218
- fix(genui-sdk-vue): fix jsonrepair dependency and add export by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/223

**Playground**
- fix(playground): only show prompt variants in Vue framework by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/217
- fix(playground): fall back to A2A 0.3 when 1.0 invoke fails by @yy-wow in https://github.com/opentiny/genui-sdk/pull/219

---

## ♻️ Refactor

**Components**
- refactor(materials): restructure vue materials package and fix playground template preview by @yy-wow in https://github.com/opentiny/genui-sdk/pull/191
- refactor: add new packages and refactor exports by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/206
- refactor(ng): decouple OpenTiny NG materials from schema renderer by @yy-wow in https://github.com/opentiny/genui-sdk/pull/213

---

## 🔧 Other Changes

**Build**
- chore: update submodule to enhance vue renderer apply default props by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/204
- build: add element-plus to workflow and Angular build externals by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/220
- ci: fix GitHub Pages check-openapi-tools URL error by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/221

**Docs**
- docs: add internationalization by @lhuans in https://github.com/opentiny/genui-sdk/pull/189
- docs: add logo and DeepWiki badge to README by @chilingling in https://github.com/opentiny/genui-sdk/pull/195
- docs: add copy page markdown button to VitePress docs by @lhuans in https://github.com/opentiny/genui-sdk/pull/198
- fix(docs): keep top nav highlight when switching sidebar pages by @lhuans in https://github.com/opentiny/genui-sdk/pull/199
- fix(docs): use onContentUpdated for copy-page title anchor by @yy-wow in https://github.com/opentiny/genui-sdk/pull/201

**Site**
- feat(homepage): implement language switcher and add English translations by @lhuans in https://github.com/opentiny/genui-sdk/pull/172
