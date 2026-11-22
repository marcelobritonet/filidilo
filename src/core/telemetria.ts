// Estatísticas de uso anônimas, enviadas ao PostHog (servidor nos EUA).
// Sem cookies, sem nome ou e-mail e sem o texto dos cartões: só o nome do evento e números.
// Os eventos esperam numa fila neste aparelho e vão quando houver internet.
// A pessoa pode desligar em Aparência.

/**
 * Chave pública do projeto no PostHog (começa com "phc_"), vinda da variável VITE_POSTHOG_KEY no build
 * (no GitHub: Settings → Secrets and variables → Actions → Variables). Sem ela, a telemetria fica desligada,
 * por isso o app rodando no computador e cópias do repositório não mandam eventos.
 */
export const CHAVE_POSTHOG: string = import.meta.env.VITE_POSTHOG_KEY ?? ''
const HOST = 'https://us.i.posthog.com'

// As chaves guardadas no aparelho mantêm o prefixo do nome antigo (tatino.) para não perder o que já foi salvo.
const K_ID = 'tatino-tel-id'
const K_FILA = 'tatino-tel-fila'
const K_DESLIGADA = 'tatino-telemetria'
const K_TESTE = 'tatino-teste'
const MAX_FILA = 500

interface Evento {
  event: string
  timestamp: string
  properties: Record<string, string | number | boolean | undefined>
}

const ler = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const gravar = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* sem armazenamento: segue sem telemetria */
  }
}

export const telemetriaDisponivel = () => !!CHAVE_POSTHOG
export const telemetriaLigada = () => telemetriaDisponivel() && ler(K_DESLIGADA) !== 'off'

/** Aparelho de teste (do Marcelo): os eventos vão com `teste: true`, para ficarem fora das contas. */
export const aparelhoDeTeste = () => ler(K_TESTE) === '1'

/**
 * Lê `?teste=1` (marca este aparelho como de teste) ou `?teste=0` (desmarca) no endereço e tira o
 * parâmetro do endereço. Manda o evento `aparelho_teste`, para dar para tirar também os eventos
 * antigos desse aparelho. Devolve se mudou algo.
 */
export function marcarTesteDaUrl(): boolean {
  const url = new URL(window.location.href)
  const v = url.searchParams.get('teste')
  if (v !== '1' && v !== '0') return false
  url.searchParams.delete('teste')
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  gravar(K_TESTE, v === '1' ? '1' : null)
  evento('aparelho_teste', { ligado: v === '1' })
  return true
}

export function ligarTelemetria(ligar: boolean): void {
  gravar(K_DESLIGADA, ligar ? null : 'off')
  if (!ligar) {
    gravar(K_FILA, null)
    gravar(K_ID, null)
  }
}

/** Id aleatório deste aparelho; não identifica a pessoa. */
function idAnonimo(): string {
  let id = ler(K_ID)
  if (!id) {
    id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    gravar(K_ID, id)
  }
  return id
}

function lerFila(): Evento[] {
  try {
    return JSON.parse(ler(K_FILA) ?? '[]') as Evento[]
  } catch {
    return []
  }
}

let agendado: ReturnType<typeof setTimeout> | undefined
let enviando = false

/** Registra um evento. Nunca lança erro e não faz nada se estiver desligada. */
export function evento(nome: string, props: Evento['properties'] = {}): void {
  if (!telemetriaLigada()) return
  const fila = lerFila()
  // A versão vai na hora do evento: um evento que esperou na fila não ganha a versão nova.
  const properties = { ...props, versao: __VERSAO__, ...(aparelhoDeTeste() ? { teste: true } : {}) }
  fila.push({ event: nome, timestamp: new Date().toISOString(), properties })
  gravar(K_FILA, JSON.stringify(fila.slice(-MAX_FILA)))
  clearTimeout(agendado)
  agendado = setTimeout(() => void enviar(), 5000)
}

/** Manda a fila. Em caso de falha, os eventos ficam para a próxima. */
export async function enviar(saindo = false): Promise<void> {
  if (!telemetriaLigada() || enviando || (typeof navigator !== 'undefined' && navigator.onLine === false)) return
  const fila = lerFila()
  if (!fila.length) return
  enviando = true
  const lote = fila.slice(0, 100)
  const distinct_id = idAnonimo()
  try {
    const r = await fetch(`${HOST}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: saindo,
      body: JSON.stringify({
        api_key: CHAVE_POSTHOG,
        batch: lote.map((e) => ({
          ...e,
          properties: { versao: __VERSAO__, ...e.properties, distinct_id, $lib: 'filidilo', $process_person_profile: false },
        })),
      }),
    })
    if (r.ok) gravar(K_FILA, JSON.stringify(lerFila().slice(lote.length)))
  } catch {
    /* sem rede: tenta depois */
  } finally {
    enviando = false
  }
  if (!saindo && lerFila().length && lote.length === 100) void enviar()
}

/** Abre a telemetria: evento de abertura e envios ao voltar a internet e ao sair do app. */
export function iniciarTelemetria(): void {
  if (!telemetriaLigada()) return
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  evento('app_aberto', { instalado })
  window.addEventListener('appinstalled', () => evento('app_instalado'))
  window.addEventListener('online', () => void enviar())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void enviar(true)
  })
}
