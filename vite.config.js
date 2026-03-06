import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/personal-tools/' : '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  server: {
    host: '0.0.0.0', // Allow access from network (for iPhone)
    port: 3000,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  publicDir: 'public'
}))

