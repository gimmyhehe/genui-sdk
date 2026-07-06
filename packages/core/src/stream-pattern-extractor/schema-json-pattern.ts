import { getPartialStartRegString } from './common';
import { FlagWrapPattern } from './flag-wrap-pattern';

/** 识别 ` ```schemaJson ` 代码块包裹的流式 Schema 内容段 */
export class SchemaJsonPattern extends FlagWrapPattern {
  constructor() {
    super('```schemaJson', '```', {
      endRegex: new RegExp(`\\n\\s*${'```'}`),
      partialEndRegex: new RegExp(`\\n(\\s*${getPartialStartRegString('```')})?$`),
    });
  }
}
