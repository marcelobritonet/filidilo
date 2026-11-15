// Arquivo recebido pelo "Compartilhar" do Android: o service worker (public/sw-receber.js)
// guarda o texto num cache e abre o app com ?receber=1.

const CACHE = 'tatino-recebido'
const chave = () => `${import.meta.env.BASE_URL}__recebido`

/** Se o app abriu por um compartilhamento, devolve o conteúdo (uma vez só) e limpa a URL. */
export async function pegarRecebido(): Promise<{ texto: string } | { erro: string } | null> {
  const q = new URLSearchParams(location.search).get('receber')
  if (!q) return null
  history.replaceState(history.state, '', location.pathname)
  if (q === 'erro') return { erro: 'Não consegui ler o arquivo compartilhado. Tente compartilhar de novo.' }
  try {
    const cache = await caches.open(CACHE)
    const r = await cache.match(chave())
    if (!r) return { erro: 'O arquivo compartilhado não chegou. Tente compartilhar de novo.' }
    await cache.delete(chave())
    return { texto: await r.text() }
  } catch {
    return { erro: 'Não consegui ler o arquivo compartilhado.' }
  }
}
