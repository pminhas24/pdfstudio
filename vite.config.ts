/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        // The three big PDF libraries each go in their own chunk so the
        // initial load isn't one monolithic bundle.
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          fabric: ['fabric'],
          pdflib: ['pdf-lib'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
})
