import type { UserConfig } from 'vitepress';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

export const sharedConfig: UserConfig = {
  base: '/genui-sdk-docs/',
  ignoreDeadLinks: true,
  markdown: {
    config(md) {
      md.use(vitepressDemoPlugin);
      md.use(tabsMarkdownPlugin);
    },
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'genui-renderer-ng-element',
      },
    },
  },
  vite: {
    server: {
      host: '0.0.0.0',
      open: true,
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny/genui-sdk' }],
    search: {
      provider: 'local',
    },
  },
};
