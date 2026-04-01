import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['react', 'react-dom', 'recharts'] },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true, passes: 2 },
      mangle: { toplevel: true },
    },
    sourcemap: false,
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/data': 'http://localhost:8000',
      '/preview': 'http://localhost:8000',
    }
  }
})
