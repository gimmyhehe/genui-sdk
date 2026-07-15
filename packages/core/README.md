# @opentiny/genui-sdk-core


Core capabilities for GenUI SDK: protocol types, prompt generation, streaming schema extraction, delta patching, JSON repair, and more. Used by Vue / Angular / Server packages.

## Install

```bash
npm install @opentiny/genui-sdk-core
# or
pnpm add @opentiny/genui-sdk-core
```

## Modules

| Module | Main exports |
|--------|----------------|
| `protocols` | `IChatMessage`, `CardSchema`, `IMaterials`, and related Zod schemas |
| `material` | `IMaterials`, `IMaterialsMeta`, `buildMaterialDefaultValueMap` |
| `prompt-generator` | `genPrompt`, `genRootSchema`, `genJsonSchema` |
| `stream-pattern-extractor` | `PatternExtractor`, `SchemaJsonPattern`, `getPartialStartRegString` |
| `delta-patcher` | `DeltaPatcher` |
| `delta-json-path-selector` | `matchJsonPath`, `jsonSelectorMatcher` |
| `repair-json` | `repairJson`, `safeJsonParse` |

## Usage

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

## Docs

- [GenUI SDK](https://opentiny.design/genui-sdk)
- [Quick Start](https://docs.opentiny.design/genui-sdk/guide/quick-start)
