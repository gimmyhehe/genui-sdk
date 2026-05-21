import type { Component } from 'vue';
import {
  ElInput,
  ElDatePicker,
  ElButton,
  ElForm,
  ElFormItem,
  ElTable,
  ElTableColumn,
  ElCard,
  ElRow,
  ElCol,
  ElSelect,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSwitch,
  ElCheckbox,
  ElTag,
  ElDivider,
} from 'element-plus';

export let extended = false;

/** 将 Element Plus 组件注册到 schema renderer 的 Mapper */
export const extendMapper = (Mapper: Record<string, Component>, customComponents: Record<string, Component> = {}) => {
  if (extended) return;
  extended = true;

  Object.assign(Mapper, {
    ElInput,
    ElDatePicker,
    ElButton,
    ElForm,
    ElFormItem,
    ElTable,
    ElTableColumn,
    ElCard,
    ElRow,
    ElCol,
    ElSelect,
    ElOption,
    ElRadio,
    ElRadioGroup,
    ElSwitch,
    ElCheckbox,
    ElTag,
    ElDivider,
  });

  Object.keys(customComponents).forEach((key) => {
    Mapper[key] = customComponents[key];
  });
};
