import { watch, type ComponentPublicInstance, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';

export const useInputMessage = (chatInstance: Ref<ComponentPublicInstance<typeof GenuiChat>>) => {
  const route = useRoute();

  const initInputMessage = () => {
    const inputMessage = route.query['input-message'];
    if (typeof inputMessage !== 'string' || !inputMessage || !chatInstance.value) {
      return;
    }

    const conversation = chatInstance.value?.getConversation();

    const unwatch = watch(
      () => conversation.state.loading,
      (newValue) => {
        if (!newValue) {
          chatInstance.value?.setInputMessage(inputMessage);
          unwatch();
        }
      },
      { immediate: true },
    );
  };
  return {
    initInputMessage,
  };
};
