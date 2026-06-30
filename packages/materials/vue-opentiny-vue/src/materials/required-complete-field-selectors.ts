export const requiredCompleteFieldSelectors = [
  '[componentName=TinyTabItem] > props > name',
  '[componentName=TinyTransfer] > props > data',
  '[componentName=TinyNumeric] > props > controlsPosition',
  '[componentName=TinyNumeric] > props > modelValue',
  '[componentName^=TinyChart] > props > :string',
  '[componentName=TinyChartPie] > props > data > rows > *',
  '[componentName=TinyForm] > props > labelPosition',
  '[componentName=TinyRadioGroup] > props > options > * > label',
];
