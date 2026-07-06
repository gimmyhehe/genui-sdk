# @opentiny/genui-sdk-chat-completions

GenUI SDK 的 LLM 对话补全封装，整合 AI SDK 与 core / materials，供 `@opentiny/genui-sdk-server` 与 playground 使用。

## 安装

```bash
pnpm add @opentiny/genui-sdk-chat-completions @opentiny/genui-sdk-core
```

## 主要 API

- `createChatCompletions` — 创建流式/非流式补全
- `fetchChatCompletions` — 底层 fetch 封装
- AI SDK 适配层（`ai-sdk-chat`）

## 文档

- [Server 使用指南](https://docs.opentiny.design/genui-sdk/guide/server-usage)
