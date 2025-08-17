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
      external: ['three', '@sparkjsdev/spark']
    },
    chunkSizeWarningLimit: 1500
  },
  optimizeDeps: {
    exclude: ['three', '@sparkjsdev/spark']
  },
  resolve: {
    alias: {
      'three': 'https://unpkg.com/three@0.174.0/build/three.module.js',
      '@sparkjsdev/spark': 'https://sparkjs.dev/releases/spark/0.1.8/spark.module.js'
    }
  }
}) 