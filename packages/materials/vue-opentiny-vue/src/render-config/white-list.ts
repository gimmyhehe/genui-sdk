import type { Component } from 'vue';
import TinyButton from '@opentiny/vue-button';
import TinyCard from '@opentiny/vue-card';
import TinyCarousel from '@opentiny/vue-carousel';
import TinyCarouselItem from '@opentiny/vue-carousel-item';
import TinyChartBar from '@opentiny/vue-chart-bar';
import TinyChartHistogram from '@opentiny/vue-chart-histogram';
import TinyChartLine from '@opentiny/vue-chart-line';
import TinyChartPie from '@opentiny/vue-chart-pie';
import TinyChartRadar from '@opentiny/vue-chart-radar';
import TinyChartRing from '@opentiny/vue-chart-ring';
import TinyCheckbox from '@opentiny/vue-checkbox';
import TinyCheckboxButton from '@opentiny/vue-checkbox-button';
import TinyCheckboxGroup from '@opentiny/vue-checkbox-group';
import TinyCol from '@opentiny/vue-col';
import TinyDatePicker from '@opentiny/vue-date-picker';
import TinyForm from '@opentiny/vue-form';
import TinyFormItem from '@opentiny/vue-form-item';
import TinyGrid from '@opentiny/vue-grid';
import TinyInput from '@opentiny/vue-input';
import TinyLayout from '@opentiny/vue-layout';
import TinyNumeric from '@opentiny/vue-numeric';
import TinyRadio from '@opentiny/vue-radio';
import TinyRadioGroup from '@opentiny/vue-radio-group';
import TinyRow from '@opentiny/vue-row';
import TinySearch from '@opentiny/vue-search';
import TinySwitch from '@opentiny/vue-switch';
import TinyTabItem from '@opentiny/vue-tab-item';
import TinyTransfer from '@opentiny/vue-transfer';
import TinyTree from '@opentiny/vue-tree';

import TinySelectWrap from '../components/TinySelectWrap.vue';
import TinyTabsWrap from '../components/TinyTabsWrap.vue';

export type WhiteListRenderEntry = {
  name: string;
  component?: Component;
};

export const whiteListRenderEntries: WhiteListRenderEntry[] = [
  { name: 'a' },
  { name: 'h1' },
  { name: 'h2' },
  { name: 'h3' },
  { name: 'h4' },
  { name: 'h5' },
  { name: 'h6' },
  { name: 'p' },
  { name: 'ol' },
  { name: 'ul' },
  { name: 'li' },
  { name: 'input' },
  { name: 'video' },
  { name: 'Img' },
  { name: 'label' },
  { name: 'div' },
  { name: 'Slot' },
  { name: 'Text' },
  { name: 'Icon' },
  { name: 'Img' },
  { name: 'TinyCarouselItem', component: TinyCarouselItem },
  { name: 'TinyCarousel', component: TinyCarousel },
  { name: 'TinyRow', component: TinyRow },
  { name: 'TinyLayout', component: TinyLayout },
  { name: 'TinyForm', component: TinyForm },
  { name: 'TinyFormItem', component: TinyFormItem },
  { name: 'TinyCol', component: TinyCol },
  { name: 'TinyButton', component: TinyButton },
  { name: 'TinyInput', component: TinyInput },
  { name: 'TinyRadio', component: TinyRadio },
  { name: 'TinyRadioGroup', component: TinyRadioGroup },
  { name: 'TinySwitch', component: TinySwitch },
  { name: 'TinySearch', component: TinySearch },
  { name: 'TinyCheckbox', component: TinyCheckbox },
  { name: 'TinyCheckboxButton', component: TinyCheckboxButton },
  { name: 'TinyCheckboxGroup', component: TinyCheckboxGroup },
  { name: 'TinyTabItem', component: TinyTabItem },
  { name: 'TinyGrid', component: TinyGrid },
  { name: 'TinyCard', component: TinyCard },
  { name: 'TinyTree', component: TinyTree },
  { name: 'TinyDatePicker', component: TinyDatePicker },
  { name: 'TinyNumeric', component: TinyNumeric },
  { name: 'TinyTransfer', component: TinyTransfer },
  { name: 'TinyChartPie', component: TinyChartPie },
  { name: 'TinyChartLine', component: TinyChartLine },
  { name: 'TinyChartHistogram', component: TinyChartHistogram },
  { name: 'TinyChartBar', component: TinyChartBar },
  { name: 'TinyChartRadar', component: TinyChartRadar },
  { name: 'TinyChartRing', component: TinyChartRing },
  { name: 'TinyTabs', component: TinyTabsWrap },
  { name: 'TinySelect', component: TinySelectWrap },
];

export const whiteList: string[] = whiteListRenderEntries.map((e) => e.name);

export const whiteListComponents: Record<string, Component> = whiteListRenderEntries.reduce((acc, e) => {
  if (e.component) {
    acc[e.name] = e.component;
  }
  return acc;
}, {});
