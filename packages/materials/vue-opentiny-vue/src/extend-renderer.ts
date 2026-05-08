import type { Component } from 'vue';
// TODO: to be remove
// import ActionButton from './components/ActionButton.vue';
import TinyTabsWrap from './components/TinyTabsWrap.vue';
// import GridStack from './components/GridStack.vue';
// import GridStackItem from './components/GridStackItem.vue';
import TinyHuichartsLine from '@opentiny/vue-huicharts-line';
import TinyHuichartsHistogram from '@opentiny/vue-huicharts-histogram';
import TinyHuichartsBar from '@opentiny/vue-huicharts-bar'; 
import TinyHuichartsRadar from '@opentiny/vue-huicharts-radar';
import TinyHuichartsRing from '@opentiny/vue-huicharts-ring';
import TinyHuichartsPie from '@opentiny/vue-huicharts-pie';
import TinyHuichartsFunnel from '@opentiny/vue-huicharts-funnel';
import TinyHuichartsScatter from '@opentiny/vue-huicharts-scatter';
import TinyHuichartsWaterfall from '@opentiny/vue-huicharts-waterfall';
import TinyHuichartsGauge from '@opentiny/vue-huicharts-gauge';
import TinyHuichartsGraph from '@opentiny/vue-huicharts-graph';
import TinyHuichartsProcess from '@opentiny/vue-huicharts-process';


export let extened = false;
export const extendMapper = (Mapper: any, customComponents: Record<string, Component>) => {
  if (extened) return;
  extened = true;
  // Mapper.ActionButton = ActionButton;
  Mapper.TinyTabs = TinyTabsWrap;
  Mapper.TinyHuichartsLine = TinyHuichartsLine;
  Mapper.TinyHuichartsHistogram = TinyHuichartsHistogram;
  Mapper.TinyHuichartsBar = TinyHuichartsBar;
  Mapper.TinyHuichartsRadar = TinyHuichartsRadar;
  Mapper.TinyHuichartsRing = TinyHuichartsRing;
  Mapper.TinyHuichartsPie = TinyHuichartsPie;
  Mapper.TinyHuichartsFunnel = TinyHuichartsFunnel;
  Mapper.TinyHuichartsScatter = TinyHuichartsScatter;
  Mapper.TinyHuichartsWaterfall = TinyHuichartsWaterfall;
  Mapper.TinyHuichartsGauge = TinyHuichartsGauge;
  Mapper.TinyHuichartsGraph = TinyHuichartsGraph;
  Mapper.TinyHuichartsProcess = TinyHuichartsProcess;

  Object.keys(customComponents).forEach((key) => {
    Mapper[key] = customComponents[key];
  });
  // Mapper.GridStack = GridStack;
  // Mapper.GridStackItem = GridStackItem;
};
