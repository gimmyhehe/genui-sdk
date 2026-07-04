import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const repoRoot = path.resolve(__dirname, '../../..');

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      root: path.resolve(__dirname, './test'),
      plugins: [vue()],
      resolve: {
        alias: {
          '@opentiny/tiny-schema-renderer': path.resolve(repoRoot, 'projects/tiny-schema-renderer/index.js'),
        },
      },
      server: {
        open: true,
      },
    };
  }

  return {
    plugins: [
      vue(),
      dts({
        rollupTypes: true,
      }),
      cssInjectedByJsPlugin(),
    ],
    build: {
      lib: {
        entry: {
          index: path.resolve(__dirname, './src/index.ts'),
          'render-config': path.resolve(__dirname, './src/render-config/index.ts'),
          materials: path.resolve(__dirname, './src/materials/index.ts'),
        },
        formats: ['es'],
        fileName: (_format, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        external: [
          ...Object.keys(packageJson.dependencies || {}).map(
            (name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`),
          ),
        ],
      },
    },
  };
});
