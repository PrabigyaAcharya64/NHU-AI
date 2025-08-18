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
      external: ['three', '@sparkjsdev/spark'],
      output: {
        assetFileNames: (assetInfo) => {
          // Keep video files in their original format for better compatibility
          if (assetInfo.name && assetInfo.name.match(/\.(mp4|webm|mov)$/)) {
            return 'assets/[name].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    },
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 0 // Don't inline any assets, especially videos
  },
  optimizeDeps: {
    exclude: ['three', '@sparkjsdev/spark']
  },
  resolve: {
    alias: {
      'three': 'https://unpkg.com/three@0.174.0/build/three.module.js',
      '@sparkjsdev/spark': 'https://sparkjs.dev/releases/spark/0.1.8/spark.module.js'
    }
  },
  assetsInclude: ['**/*.mp4', '**/*.webm', '**/*.mov'] // Explicitly include video formats
}) 