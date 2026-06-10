/**
 * 模板专用 chat 类型，仅保留无法从 @opentiny/genui-sdk-vue / @opentiny/genui-sdk-core 复用的部分。
 * IMessage、IBubbleSlotsProps 等请从 @opentiny/genui-sdk-vue 引入；
 * IStreamDelta 请从 @opentiny/genui-sdk-core 引入。
 */
import type { IStreamDelta } from '@opentiny/genui-sdk-core';

export interface LLMConfig {
  model: string;
  temperature: number;
}

export interface ISchemaCardMessageItem {
  type: 'schema-card';
  content: string;
  input: string;
  cardId: string;
  generatedTime: string;
  schema: string;
  id?: string;
  state?: Record<string, any>;
  prevSchema: string;
}

export interface IJsonPatchMessageItem {
  type: 'json-patch';
  content: string;
  input: string;
  cardId: string;
  generatedTime: string;
  schema: string;
  prevSchema: string;
}

/** 单次手动编辑记录（合并卡片内的子版本） */
export interface ISchemaManualEditRecord {
  editId: string;
  schema: string;
  prevSchema: string;
  generatedTime: string;
  input: string;
  /** 该手动卡片的首次保存：基准 schema 来源版本（cardId 或 editId） */
  sourceCardId?: string;
  /** 来源版本标题快照（兼容旧数据） */
  sourceCardInput?: string;
  /** 来源版本创建时间快照，历史面板用时间指向版本 */
  sourceCardGeneratedTime?: string;
}

/** 用户在 SchemaJSON 编辑器中手动保存的版本（连续保存合并为一张卡片） */
export interface ISchemaManualMessageItem {
  type: 'schema-manual';
  content: string;
  input: string;
  cardId: string;
  generatedTime: string;
  schema: string;
  prevSchema: string;
  /** 多次保存的操作记录；缺省时视为仅一次编辑（兼容旧数据） */
  edits?: ISchemaManualEditRecord[];
}

export interface IMarkdownMessageItem {
  type: 'markdown';
  content: string;
  input: string;
  cardId: string;
}

export type IMessageItem =
  | IMarkdownMessageItem
  | IJsonPatchMessageItem
  | ISchemaCardMessageItem
  | ISchemaManualMessageItem;

export interface IChatMessage {
  role: 'assistant';
  content: string;
  messages: IMessageItem[];
}

export type INotificationPayload = {
  type: 'markdown' | 'json-patch' | 'schema-card' | 'done';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
  cardId?: string;
};
