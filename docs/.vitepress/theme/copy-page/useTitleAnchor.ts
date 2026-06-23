import { nextTick, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';

const COPY_ANCHOR_ID = 'vp-doc-copy-anchor';
const MAX_MOUNT_RETRIES = 30;
const MOUNT_RETRY_INTERVAL = 100;

function cleanupTitleRow(): void {
  const row = document.querySelector('.vp-doc-title-row');
  if (!row?.parentElement) {
    return;
  }

  const h1 = row.querySelector('h1');
  if (h1) {
    row.parentElement.insertBefore(h1, row);
  }

  row.remove();
}

function mountTitleActions(): HTMLElement | null {
  cleanupTitleRow();

  const doc = document.querySelector('.VPDoc .vp-doc');
  const h1 = doc?.querySelector('h1');
  if (!h1?.parentElement) {
    return null;
  }

  const row = document.createElement('div');
  row.className = 'vp-doc-title-row';
  h1.parentElement.insertBefore(row, h1);
  row.appendChild(h1);

  const actions = document.createElement('div');
  actions.className = 'vp-doc-title-actions';
  actions.id = COPY_ANCHOR_ID;
  row.appendChild(actions);

  return actions;
}

export function useTitleAnchor() {
  const anchor = ref<HTMLElement | null>(null);
  const route = useRoute();
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function clearRetryTimer(): void {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  }

  async function refreshAnchor(retries = MAX_MOUNT_RETRIES): Promise<void> {
    await nextTick();
    anchor.value = mountTitleActions();

    if (!anchor.value && retries > 0) {
      clearRetryTimer();
      retryTimer = setTimeout(() => {
        refreshAnchor(retries - 1);
      }, MOUNT_RETRY_INTERVAL);
    }
  }

  watch(
    () => route.path,
    () => {
      clearRetryTimer();
      anchor.value = null;
      refreshAnchor();
    },
    { immediate: true },
  );

  onUnmounted(() => {
    clearRetryTimer();
    cleanupTitleRow();
    anchor.value = null;
  });

  return { anchor };
}
