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
  ElTabs,
  ElTabPane,
} from 'element-plus';
import Icon from './Icon.vue';

export interface IComponents {
  [key: string]: Component;
}

export const components: IComponents = {
  Icon,
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
  ElTabs,
  ElTabPane,
};
