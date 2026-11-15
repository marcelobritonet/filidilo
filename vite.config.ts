import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages publica em https://<usuario>.github.io/tatino/
const base = process.env.BASE_PATH ?? '/tatino/'

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Tatino — Flashcards',
        short_name: 'Tatino',
        description: 'Flashcards de Hidrodinâmica para estudar offline',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f2a3d',
        theme_color: '#0f2a3d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
