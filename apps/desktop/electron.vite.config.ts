import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  main: {
    // Externalize node dependencies (e.g. socket.io-client/ws and its optional
    // native deps like bufferutil) so they are required at runtime instead of
    // bundled. Keep @copycloud/shared bundled since it is ESM-only.
    plugins: [externalizeDepsPlugin({ exclude: ['@copycloud/shared'] })],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
