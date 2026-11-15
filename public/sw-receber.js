// Recebe arquivos pelo "Compartilhar" do Android (Web Share Target).
// Importado pelo service worker gerado (vite.config.ts → workbox.importScripts).
// O Android faz um POST em <base>receber com o arquivo; guardamos o texto num cache
// e redirecionamos para o app, que abre o resumo do baralho (src/ui/Baralhos.tsx).
/* eslint-disable no-restricted-globals */
const CACHE_RECEBIDO = 'tatino-recebido'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || !url.pathname.endsWith('/receber')) return
  const base = url.pathname.replace(/receber$/, '')
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData()
        const arquivo = form.get('arquivo')
        let texto = ''
        let nome = ''
        if (arquivo && typeof arquivo !== 'string') {
          texto = await arquivo.text()
          nome = arquivo.name || ''
        } else {
          // Alguns apps compartilham o conteúdo como texto, não como arquivo.
          texto = String(form.get('text') || '')
        }
        const cache = await caches.open(CACHE_RECEBIDO)
        await cache.put(`${base}__recebido`, new Response(texto, { headers: { 'content-type': 'text/plain; charset=utf-8', 'x-nome': encodeURIComponent(nome) } }))
        return Response.redirect(`${base}?receber=1`, 303)
      } catch (e) {
        return Response.redirect(`${base}?receber=erro`, 303)
      }
    })(),
  )
})
