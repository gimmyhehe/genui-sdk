import { UNWRAP_QUOTES } from './constants';

const hyphenateRE = /\B([A-Z])/g;
const onRE = /^on([A-Z]\w*)/;
const onUpdateRE = /^on(Update:\w+)/;
const { start, end } = UNWRAP_QUOTES;

/**
 * 首字母大写。
 * @param str - 字符串
 * @returns 首字母大写后的字符串
 */
export const capitalize = (str = ''): string => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

/**
 * camelCase -> kebab-case。
 * @param str - 字符串
 * @returns kebab-case 字符串
 */
export const hyphenate = (str: string): string => str.replace(hyphenateRE, '-$1').toLowerCase();

/**
 * 将协议事件名转换为 Vue 模板事件名。
 * @param str - 事件名
 * @returns 转换后的事件名
 */
export const toEventKey = (str: string): string => {
  const strRemovedPrefix = str.replace(onRE, '$1');
  const isOnUpdate = onUpdateRE.test(str);
  return isOnUpdate
    ? strRemovedPrefix.charAt(0).toLowerCase() + strRemovedPrefix.slice(1)
    : hyphenate(strRemovedPrefix);
};

/**
 * 反序列化表达式占位符，恢复原始表达式内容。
 * @param value - 表达式字符串
 * @returns 恢复后的表达式字符串
 */
export const unwrapExpression = (value: string): string =>
  value.replace(new RegExp(`"${start}(.*?)${end}"`, 'g'), (match, p1) =>
    p1.replace(/\\"/g, '"').replace(/\\r\\n|\\r|\\n/g, ''),
  );

