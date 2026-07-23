import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/rm-calendar-192.svg', 'icons/rm-calendar-512.svg'],
      manifest: {
        name: 'RM Calendar',
        short_name: 'RM Calendar',
        description: 'An independent planning companion for people, visits, notes, and follow-ups.',
        theme_color: '#09111f',
        background_color: '#09111f',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/rm-calendar-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/rm-calendar-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: []
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
})
