// Preferência de aparência: sistema, claro ou escuro. Guardada só neste aparelho.
// Não toca em nenhum dado de estudo.

export type PreferenciaTema = 'system' | 'light' | 'dark'
export type Tema = 'light' | 'dark'

// Chave do nome antigo (tatino.), mantida para não perder a escolha de quem já usa. Igual em index.html.
const CHAVE = 'tatino-theme'
const COR_NAVEGADOR: Record<Tema, string> = { light: '#F7F9FF', dark: '#0B1E3F' }
const consultaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)')

export function lerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function temaResolvido(p: PreferenciaTema): Tema {
  if (p !== 'system') return p
  return consultaEscuro().matches ? 'dark' : 'light'
}

function aplicar(t: Tema) {
  document.documentElement.dataset.theme = t
  const cor = document.documentElement.classList.contains('abrindo') ? COR_NAVEGADOR.dark : COR_NAVEGADOR[t]
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', cor)
}

let ouvinte: (() => void) | null = null

/** Aplica a preferência e, em "sistema", acompanha a mudança do aparelho. */
export function aplicarPreferencia(p: PreferenciaTema) {
  aplicar(temaResolvido(p))
  const mq = consultaEscuro()
  if (ouvinte) mq.removeEventListener('change', ouvinte)
  ouvinte = null
  if (p === 'system') {
    ouvinte = () => aplicar(temaResolvido('system'))
    mq.addEventListener('change', ouvinte)
  }
}

/** Fim da abertura: a página e a barra do navegador voltam para as cores do tema. */
export function terminarAbertura() {
  document.documentElement.classList.remove('abrindo')
  aplicarPreferencia(lerPreferencia())
}

export function salvarPreferencia(p: PreferenciaTema) {
  try {
    if (p === 'system') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, p)
  } catch {
    /* modo privado: vale só nesta sessão */
  }
  aplicarPreferencia(p)
}
