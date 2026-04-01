import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sap': {
        target: 'https://vhnlqds4ap01.sap.niififl.in:44300',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})