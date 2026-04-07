const hyphenateRE = /\B([A-Z])/g;

/** 首字母大写。 */
export const capitalize = (str = ''): string => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

/** camelCase -> kebab-case。 */
export const hyphenate = (str: string): string => str.replace(hyphenateRE, '-$1').toLowerCase();

