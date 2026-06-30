export const requiredCompleteFieldSelectors = [
  '[componentName=Img] > props > src',
  'componentName',
  'style',
  '[componentName=Page] > css',
  '[type=JSFunction]',
  '[type=JSExpression]',
  '[type=JSSlot][value=]',
  'type',
  ':empty:object',
  // ng element version
  '[componentName=img] > props > src',
  '[componentName] > props > ngModel',
];
