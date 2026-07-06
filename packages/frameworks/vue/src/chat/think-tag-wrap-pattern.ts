import { FlagWrapPattern } from '@opentiny/genui-sdk-core';

/** 识别 `<think>` 推理标签包裹的流式内容段 */
export class ThinkTagWrapPattern extends FlagWrapPattern {
  constructor() {
    super('<think>', '</think>');
  }
}
