import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'app-icon.svg',
        'app-icon-192.png',
        'app-icon-512.png',
        'app-icon-maskable-512.png',
      ],
      manifest: {
        name: 'Atende — Automação e agenda',
        short_name: 'Atende',
        description: 'Atendimento automatizado e agenda em um só lugar.',
        theme_color: '#1769e0',
        background_color: '#f5f7fb',
        display: 'standalone',
        start_url: '/app',
        scope: '/',
        lang: 'pt-BR',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/app-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/$/, /^\/app(?:\/|$)/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
