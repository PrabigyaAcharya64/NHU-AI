import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['three', '@sparkjsdev/spark', 'three/examples/jsm/controls/TransformControls.js']
    },
    chunkSizeWarningLimit: 1500
  },
  optimizeDeps: {
    exclude: ['three', '@sparkjsdev/spark']
  }
}) 