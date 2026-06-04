import { computed, inject, onMounted, onUnmounted, ref, type ComputedRef } from 'vue';
import { GENUI_CONFIG } from '@opentiny/genui-sdk-vue';

export type PlaygroundColorTheme = 'light' | 'dark' | 'lite' | 'auto';

/**
 * 监听系统深色模式偏好，供 Monaco theme 的 auto 模式使用
 * @returns 系统是否偏好深色主题的 ref
 */
function useSystemPrefersDark() {
  const prefersDark = ref(false);
  let mql: MediaQueryList | null = null;
  const sync = () => {
    if (!mql) return;
    prefersDark.value = mql.matches;
  };
  onMounted(() => {
    if (typeof window === 'undefined') return;
    mql = window.matchMedia('(prefers-color-scheme: dark)');
    sync();
    mql.addEventListener('change', sync);
  });
  onUnmounted(() => {
    mql?.removeEventListener('change', sync);
  });
  return prefersDark;
}

/**
 * 根据 playground 主题返回 Monaco 编辑器主题（vs / vs-dark）
 * @param fallbackTheme 未注入 GENUI_CONFIG 时的主题回退函数
 * @returns Monaco 主题 computed ref
 */
export function useMonacoPlaygroundTheme(
  fallbackTheme?: () => PlaygroundColorTheme | undefined,
): ComputedRef<'vs' | 'vs-dark'> {
  const genuiConfig = inject(GENUI_CONFIG, null) as { value?: { theme?: PlaygroundColorTheme } } | null;
  const systemPrefersDark = useSystemPrefersDark();

  return computed(() => {
    const raw = fallbackTheme?.() ?? genuiConfig?.value?.theme ?? 'light';
    const isDark = raw === 'dark' || (raw === 'auto' && systemPrefersDark.value);
    return isDark ? 'vs-dark' : 'vs';
  });
}

/** Monaco DiffEditor 共用配置（inline diff，只读） */
export const SCHEMA_JSON_DIFF_EDITOR_OPTIONS = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  readOnly: true,
  originalEditable: false,
  renderSideBySide: false,
} as const;
