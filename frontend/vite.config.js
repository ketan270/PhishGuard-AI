import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// During development all /api requests are proxied to the FastAPI backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg') || id.includes('dompurify')) return 'pdf'
            if (id.includes('gsap') || id.includes('lenis')) return 'motion'
          }
        },
      },
    },
  },
})
