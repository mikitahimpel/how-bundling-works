import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/how-bundling-works/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@rollup/browser'],
  },
  assetsInclude: ['**/*.wasm'],
})
