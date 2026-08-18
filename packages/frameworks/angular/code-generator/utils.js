import { UNWRAP_QUOTES } from './constants';
const hyphenateRE = /\B([A-Z])/g;
const onRE = /^on([A-Z]\w*)/;
const onUpdateRE = /^on(Update:\w+)/;
const { start, end } = UNWRAP_QUOTES;
export const capitalize = (str = '') => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
export const hyphenate = (str) => str.replace(hyphenateRE, '-$1').toLowerCase();
export const toEventKey = (str) => {
    const strRemovedPrefix = str.replace(onRE, '$1');
    const isOnUpdate = onUpdateRE.test(str);
    return isOnUpdate
        ? strRemovedPrefix.charAt(0).toLowerCase() + strRemovedPrefix.slice(1)
        : hyphenate(strRemovedPrefix);
};
export const unwrapExpression = (value) => value.replace(new RegExp(`"${start}(.*?)${end}"`, 'g'), (match, p1) => p1.replace(/\\"/g, '"').replace(/\\r\\n|\\r|\\n/g, ''));
