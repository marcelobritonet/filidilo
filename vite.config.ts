import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// GitHub Pages publica em https://<usuario>.github.io/filidilo/
const base = process.env.BASE_PATH ?? '/filidilo/'

export default defineConfig({
  base,
  define: {
    __VERSAO__: JSON.stringify(pkg.version),
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png', 'favicon.ico'],
      manifest: {
        name: 'Filidilo: flashcards offline',
        short_name: 'Filidilo',
        description: 'Aprenda qualquer coisa: flashcards com IA, estudados no seu ritmo, offline',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B1E3F',
        theme_color: '#0B1E3F',
        // Aparece no "Compartilhar" do Android quando o app está instalado:
        // WhatsApp → segurar o arquivo → Compartilhar → Filidilo (tratado em public/sw-receber.js).
        share_target: {
          action: `${base}receber`,
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            files: [{ name: 'arquivo', accept: ['text/plain', '.txt', 'application/json', '.json'] }],
          },
        },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        navigateFallback: `${base}index.html`,
        importScripts: ['sw-receber.js'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
