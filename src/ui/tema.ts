// Preferência de aparência: sistema, claro ou escuro. Guardada só neste aparelho.
// Não toca em nenhum dado de estudo.

export type PreferenciaTema = 'system' | 'light' | 'dark'
export type Tema = 'light' | 'dark'

const CHAVE = 'tatino-theme'
const COR_NAVEGADOR: Record<Tema, string> = { light: '#FFF5DC', dark: '#111418' }
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
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', COR_NAVEGADOR[t])
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

export function salvarPreferencia(p: PreferenciaTema) {
  try {
    if (p === 'system') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, p)
  } catch {
    /* modo privado: vale só nesta sessão */
  }
  aplicarPreferencia(p)
}
