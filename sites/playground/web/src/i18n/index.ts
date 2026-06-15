import zhCN from './zh.json';
import enUS from './en.json';
import { useI18n } from '@opentiny/genui-sdk-vue';

export const STORAGE_KEY = 'GENUI_SDK_VUE_PLAYGROUND_CONFIG';

const globalI18n = useI18n();

globalI18n.mergeMessages({
  zh_CN: zhCN,
  en_US: enUS,
});

try {
  const { locale: saved } = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (saved === 'zh_CN' || saved === 'en_US') {
    globalI18n.setLocale(saved);
  }
} catch {}

const { setLocale: setLocaleInternal, t, locale, mergeMessages, messages } = globalI18n;

function setLocale(lang: string): void {
  setLocaleInternal(lang);
  try {
    const config = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, locale: lang.trim() }));
  } catch {}
}

export { t, locale, setLocale, mergeMessages, messages, useI18n };
