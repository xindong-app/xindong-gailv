import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 项目页在子路径下; 本地开发/预览保持根路径
  base: process.env.VITE_BASE ?? '/',
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    sourcemap: false,
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
    },
  },
})
