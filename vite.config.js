import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
    // Vite PWA disabled - we manage service workers manually
  ],
  build: {
    // Add timestamp to build assets for better cache busting
    rollupOptions: {
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Use terser for minification to remove console statements
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      // Don't mangle __WB_MANIFEST to preserve service worker injection point
      mangle: {
        reserved: ['__WB_MANIFEST']
      }
    }
  }
})
