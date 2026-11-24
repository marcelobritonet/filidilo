// Arquivo recebido pelo "Compartilhar" do Android: o service worker (public/sw-receber.js)
// guarda o texto num cache e abre o app com ?receber=1.
// Link recebido (…/filidilo/?b=<codigo>): o conteúdo vem do worker de links (src/core/link.ts).

import { abrirLink, ErroLink, type MotivoLink } from '../core/link'

const CACHE = 'tatino-recebido'
const chave = () => `${import.meta.env.BASE_URL}__recebido`

/** O app abriu por um link de baralho? (para mostrar "Abrindo…" enquanto baixa) */
export const abriuPorLink = () => new URLSearchParams(location.search).has('b')

/** O app abriu trazendo um baralho (link ou "Compartilhar")? Ler antes de `pegarRecebido` limpar a URL. */
export const chegouAlgo = () => {
  const p = new URLSearchParams(location.search)
  return p.has('b') || p.has('receber')
}

/** Aplica a versão nova sem perguntar? Só na tela inicial e nunca quando o app abriu trazendo
 *  um baralho: a recarga perderia o que chegou (a URL e o arquivo já foram consumidos). */
export const atualizarSozinho = (s: { atualizar: boolean; naInicial: boolean; recebeu: boolean }) =>
  s.atualizar && s.naInicial && !s.recebeu

/** Se o app abriu por um compartilhamento ou link, devolve o conteúdo (uma vez só) e limpa a URL. */
export async function pegarRecebido(): Promise<{ texto: string; via: 'arquivo' | 'link' } | { erro: string; via: 'arquivo' | 'link'; motivo?: MotivoLink } | null> {
  const params = new URLSearchParams(location.search)
  const codigo = params.get('b')
  if (codigo !== null) {
    history.replaceState(history.state, '', location.pathname)
    try {
      return { texto: await abrirLink(codigo), via: 'link' }
    } catch (e) {
      return { erro: (e as Error).message, via: 'link', motivo: e instanceof ErroLink ? e.motivo : 'outro' }
    }
  }
  const q = params.get('receber')
  if (!q) return null
  history.replaceState(history.state, '', location.pathname)
  if (q === 'erro') return { erro: 'Não consegui ler o arquivo compartilhado. Tente compartilhar de novo.', via: 'arquivo' }
  try {
    const cache = await caches.open(CACHE)
    const r = await cache.match(chave())
    if (!r) return { erro: 'O arquivo compartilhado não chegou. Tente compartilhar de novo.', via: 'arquivo' }
    await cache.delete(chave())
    return { texto: await r.text(), via: 'arquivo' }
  } catch {
    return { erro: 'Não consegui ler o arquivo compartilhado.', via: 'arquivo' }
  }
}
