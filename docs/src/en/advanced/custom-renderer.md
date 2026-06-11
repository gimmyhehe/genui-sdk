# Custom Renderer

GenUI Chat supports custom Schema Renderers, allowing you to use different rendering engines or frameworks to render Schema. This is useful for cross-framework integration, custom component libraries, or special rendering logic.

## Overview

By default, GenUI SDK uses the Vue version of `@opentiny/tiny-schema-renderer` to render Schema. With a custom Renderer, you can:

- Use renderers from other frameworks such as Angular or React
- Integrate custom component libraries
- Implement special rendering logic or optimizations
- Support different runtime environments

## Implementing a Custom Renderer

A custom Renderer must satisfy the following interface requirements:

### Required Props

- **`schema`** (required): `schemaJson` passed from the Chat component to the Renderer

### Required Methods

The custom Renderer component must expose the following methods via `defineExpose` (Vue 3) or `expose`:

- **`setContext(context: any)`**: Sets the render context for accessing external data and methods from components
- **`getContext()`**: Returns the current render context
- **`setState(state: any)`**: Sets component state for state management

## Using a Custom Renderer in Your App

### 1. Import the injection token

```vue
<script setup>
import { SCHEMA_RENDERER_INJECTION_TOKEN } from '@opentiny/genui-sdk-vue';
import { provide } from 'vue';
import CustomRenderer from './CustomRenderer.vue';

// Provide custom Renderer
provide(SCHEMA_RENDERER_INJECTION_TOKEN, CustomRenderer);
</script>
```

### 2. Use async components (recommended)

If the custom Renderer is large or should be loaded on demand, use an async component:

```vue
<script setup>
import { SCHEMA_RENDERER_INJECTION_TOKEN } from '@opentiny/genui-sdk-vue';
import { provide, defineAsyncComponent } from 'vue';

// Async load custom Renderer
const CustomRenderer = defineAsyncComponent(() => import('./CustomRenderer.vue').then((m) => m.default));

provide(SCHEMA_RENDERER_INJECTION_TOKEN, CustomRenderer);
</script>
```

## Cross-Framework Integration Example

### Integrating an Angular Renderer

The following example shows how to integrate an Angular renderer in a Vue app. `tiny-schema-renderer-element-ng` wraps the Angular renderer as a Web Component.

```vue
<template>
  <tiny-schema-renderer-element-ng ref="rendererRef"></tiny-schema-renderer-element-ng>
</template>

<script setup lang="ts">
import { ref, toRaw, watch } from 'vue';

const props = defineProps<{
  schema: any;
}>();

const rendererRef = ref<HTMLElement>();
let schema: any = null;

watch(
  [() => props.schema, () => rendererRef.value],
  ([newVal, newRendererRef]) => {
    schema = toRaw(newVal);
    if (rendererRef.value && schema.children?.length) {
      setSchema();
    }
  },
  { deep: true },
);

function setSchema() {
  (rendererRef.value as any).schema = schema;
  (rendererRef.value as any).detectChanges();
}

function setState(state: any) {
  return (rendererRef.value as any).setState(state);
}

function setContext(context: any) {
  return (rendererRef.value as any).setContext(context);
}

function getContext() {
  return (rendererRef.value as any).getContext();
}

defineExpose({
  setContext,
  getContext,
  setState,
});
</script>

<style lang="less">
tiny-schema-renderer-element-ng {
  font-size: var(--ti-common-font-size-base);
  font-family: var(--ti-common-font-family);
  color: var(--ti-common-color-text-primary);
  background-color: var(--ti-common-color-bg-white-normal);
  @import (less) 'tiny-schema-renderer-ng/dist/renderer-element/browser/styles.css';
}
</style>
```
