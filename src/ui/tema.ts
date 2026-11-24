// Tema do app: um dos cinco, guardado só neste aparelho. Não toca em nenhum dado de estudo.
//
// Cada tema tem um tipo (claro ou escuro, em data-theme) e uma paleta (data-paleta). O Noite continua
// gravado como 'dark'. O antigo 'light' (Claro, depois Névoa) vira Areia. Quem nunca escolheu abre no
// Areia ou no Noite conforme o modo do aparelho.

export type Tema = 'areia' | 'lagoa' | 'dark' | 'cobalto' | 'pavao'
export type Tipo = 'light' | 'dark'

interface DadosTema {
  tipo: Tipo
  paleta: string
  /** Cor do fundo, usada também na barra do navegador. */
  fundo: string
}

export const TEMAS: Record<Tema, DadosTema> = {
  lagoa: { tipo: 'light', paleta: 'lagoa', fundo: '#EBF4F4' },
  areia: { tipo: 'light', paleta: 'areia', fundo: '#F6F2EA' },
  dark: { tipo: 'dark', paleta: 'noite', fundo: '#0B1E3F' },
  cobalto: { tipo: 'dark', paleta: 'cobalto', fundo: '#131C30' },
  pavao: { tipo: 'dark', paleta: 'pavao', fundo: '#092525' },
}

// Chave do nome antigo (tatino.), mantida para não perder a escolha de quem já usa. Igual em index.html.
const CHAVE = 'tatino-theme'
const consultaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)')

export function ehTema(v: unknown): v is Tema {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(TEMAS, v)
}

/** Tema gravado; sem escolha, Areia ou Noite conforme o modo do aparelho. */
export function lerPreferencia(): Tema {
  try {
    const v = localStorage.getItem(CHAVE)
    if (ehTema(v)) return v
    if (v === 'light') return 'areia'
  } catch {
    /* sem localStorage: segue o aparelho */
  }
  return consultaEscuro().matches ? 'dark' : 'areia'
}

function aplicar(t: Tema) {
  const { tipo, paleta, fundo } = TEMAS[t]
  const raiz = document.documentElement
  raiz.dataset.theme = tipo
  raiz.dataset.paleta = paleta
  const cor = raiz.classList.contains('abrindo') ? TEMAS.dark.fundo : fundo
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', cor)
}

export function aplicarPreferencia(t: Tema) {
  aplicar(t)
}

/** Fim da abertura: a página e a barra do navegador voltam para as cores do tema. */
export function terminarAbertura() {
  document.documentElement.classList.remove('abrindo')
  aplicarPreferencia(lerPreferencia())
}

export function salvarPreferencia(t: Tema) {
  try {
    localStorage.setItem(CHAVE, t)
  } catch {
    /* modo privado: vale só nesta sessão */
  }
  aplicarPreferencia(t)
}

// Estilo (P121): Suave (padrão: cantos redondos, degradês das cores da logo, botões em pílula) ou Clássico
// (cartões com borda, cores chapadas). Independe do tema de cor. Vai em data-estilo; igual em index.html.
export type Estilo = 'suave' | 'classico'
const CHAVE_ESTILO = 'tatino-estilo'

// Suave desligado por enquanto (P124): ainda está em refinamento. Todo mundo fica no Clássico; só um
// aparelho liberado com ?suave=1 no endereço (index.html grava a chave; ?suave=0 tira) vê e escolhe o Suave.
const CHAVE_SUAVE = 'tatino-suave-liberado'

export function suaveLiberado(): boolean {
  try {
    return localStorage.getItem(CHAVE_SUAVE) === '1'
  } catch {
    return false
  }
}

export function lerEstilo(): Estilo {
  if (!suaveLiberado()) return 'classico'
  try {
    return localStorage.getItem(CHAVE_ESTILO) === 'classico' ? 'classico' : 'suave'
  } catch {
    return 'suave'
  }
}

export function salvarEstilo(e: Estilo) {
  if (e === 'suave' && !suaveLiberado()) return
  try {
    localStorage.setItem(CHAVE_ESTILO, e)
  } catch {
    /* modo privado: vale só nesta sessão */
  }
  document.documentElement.dataset.estilo = e
}
