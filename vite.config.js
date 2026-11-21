import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 12000, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 12000, allowedHosts: true },
  build: {
    target: 'es2019',
    assetsInlineLimit: 2048,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
          return undefined;
        },
      },
    },
  },
});
