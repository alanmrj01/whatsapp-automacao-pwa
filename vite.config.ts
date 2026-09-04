import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://alovia.netlify.app',
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: 'https://alovia.netlify.app',
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'app-icon.svg',
        'app-icon-maskable.svg',
        'app-icon-192.png',
        'app-icon-512.png',
        'app-icon-maskable-512.png',
        'refrigeration-hero.webp',
      ],
      manifest: {
        name: 'Alovia — Atendimento e agenda técnica',
        short_name: 'Alovia',
        description: 'Atendimento, agenda técnica e automação para climatização e refrigeração.',
        theme_color: '#0b67f0',
        background_color: '#f6faff',
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
          {
            src: '/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/app-icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        // Login/admin cache only the static React shell, never API responses.
        navigateFallbackAllowlist: [/^\/$/, /^\/app(?:\/|$)/, /^\/login$/, /^\/admin(?:\/|$)/],
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/auth(?:\/|$)/, /^\/internal(?:\/|$)/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
