// Estatísticas de uso anônimas, enviadas ao PostHog (servidor nos EUA).
// Sem cookies, sem nome ou e-mail e sem o texto dos cartões: só o nome do evento e números.
// Os eventos esperam numa fila neste aparelho e vão quando houver internet.
// A pessoa pode desligar em Preferências.

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
/** Dia da primeira abertura com estatísticas; fica ao desligar, para religar não contar como aparelho novo. */
const K_PRIMEIRO = 'tatino-tel-primeiro'
/** Sessão de uso: { id, ultimo }. Parado mais de 30 min, começa outra. */
const K_SESSAO = 'tatino-tel-sessao'
const SESSAO_MS = 30 * 60000
const MAX_FILA = 500
const MAX_ERROS = 10

interface Evento {
  /** Id único do evento: se um lote for reenviado (a resposta se perdeu ao sair do app), o PostHog não conta duas vezes. */
  uuid?: string
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
  if (ligar) {
    const estava = telemetriaLigada()
    gravar(K_DESLIGADA, null)
    if (!estava) evento('estatisticas_ligadas')
    return
  }
  // O aviso de desligar vai na hora, sozinho: a fila (com ele) é apagada logo em seguida.
  if (telemetriaLigada()) void postar([novoEvento('estatisticas_desligadas')], idAnonimo(), true)
  gravar(K_DESLIGADA, 'off')
  gravar(K_FILA, null)
  gravar(K_ID, null)
  gravar(K_SESSAO, null)
}

function uuid(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  const h = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16))
  h[12] = '4'
  h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16)
  const x = h.join('')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`
}

/** UUID v7 (começa pelo instante): o formato que o PostHog exige no `$session_id`. */
export function uuid7(agora = Date.now()): string {
  const h = agora.toString(16).padStart(12, '0').slice(-12) + uuid().replace(/-/g, '').slice(12)
  const x = h.slice(0, 12) + '7' + h.slice(13)
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`
}

/** Id da sessão de uso atual (renova depois de 30 min sem evento). */
function sessaoAtual(agora: number): string {
  let s: { id: string; ultimo: number } | null = null
  try {
    s = JSON.parse(ler(K_SESSAO) ?? 'null')
  } catch {
    /* recomeça */
  }
  if (!s || typeof s.id !== 'string' || !(agora - s.ultimo < SESSAO_MS)) s = { id: uuid7(agora), ultimo: agora }
  s.ultimo = agora
  gravar(K_SESSAO, JSON.stringify(s))
  return s.id
}

/** Id aleatório deste aparelho; não identifica a pessoa. */
function idAnonimo(): string {
  let id = ler(K_ID)
  if (!id) {
    id = uuid()
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

function novoEvento(nome: string, props: Evento['properties'] = {}): Evento {
  const agora = Date.now()
  // A versão vai na hora do evento: um evento que esperou na fila não ganha a versão nova.
  const properties = { ...props, versao: __VERSAO__, $session_id: sessaoAtual(agora), ...(aparelhoDeTeste() ? { teste: true } : {}) }
  return { uuid: uuid(), event: nome, timestamp: new Date(agora).toISOString(), properties }
}

/** Manda um lote ao PostHog. Devolve se ele respondeu ok. */
async function postar(lote: Evento[], distinct_id: string, saindo: boolean): Promise<boolean> {
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
    return r.ok
  } catch {
    return false
  }
}

/** Registra um evento. Nunca lança erro e não faz nada se estiver desligada. */
export function evento(nome: string, props: Evento['properties'] = {}): void {
  if (!telemetriaLigada()) return
  const fila = lerFila()
  fila.push(novoEvento(nome, props))
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
  // Eventos antigos na fila, de antes do uuid, ganham um agora (e o guardam, para um reenvio ter o mesmo).
  if (lote.some((e) => !e.uuid)) {
    for (const e of lote) e.uuid ??= uuid()
    gravar(K_FILA, JSON.stringify([...lote, ...fila.slice(lote.length)]))
  }
  try {
    // Sem rede, falha e os eventos ficam para a próxima.
    if (await postar(lote, idAnonimo(), saindo)) gravar(K_FILA, JSON.stringify(lerFila().slice(lote.length)))
  } finally {
    enviando = false
  }
  if (!saindo && lerFila().length && lote.length === 100) void enviar()
}

let erros = 0

/** Registra um erro só pelo lugar e pelo tipo (TypeError, QuotaExceededError…), nunca pela mensagem. No máximo 10 por abertura. */
export function registrarErro(onde: string, e: unknown): void {
  if (erros >= MAX_ERROS) return
  erros++
  const tipo = e instanceof Error || (e instanceof Object && typeof (e as Error).name === 'string') ? (e as Error).name : typeof e
  evento('erro', { onde, tipo: String(tipo).replace(/[^\w.-]/g, '').slice(0, 40) || 'desconhecido' })
}

export type OrigemAbertura = 'link' | 'arquivo' | 'convite' | 'imagem' | 'direto'

/**
 * Por onde o app abriu, lido do endereço antes de o app limpá-lo: link de baralho ou desafio (`?b=`),
 * arquivo compartilhado (`?receber=`), convite ou imagem compartilhada (`?de=`, que sai do endereço aqui).
 */
export function lerOrigemDaUrl(): OrigemAbertura {
  const url = new URL(window.location.href)
  const de = url.searchParams.get('de')
  if (de !== null) {
    url.searchParams.delete('de')
    history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  }
  if (url.searchParams.has('b')) return 'link'
  if (url.searchParams.has('receber')) return 'arquivo'
  return de === 'convite' || de === 'imagem' ? de : 'direto'
}

/** Abre a telemetria: evento de abertura (com aparelho e origem), primeira abertura, erros e envios ao voltar a internet e ao sair do app. */
export function iniciarTelemetria(contexto: { plataforma: string; tela: string }, origem: OrigemAbertura = 'direto'): void {
  if (!telemetriaLigada()) return
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  if (!ler(K_PRIMEIRO)) {
    // Quem já mandava estatísticas antes desta versão tem id: não é aparelho novo.
    if (!ler(K_ID)) evento('primeira_abertura', { origem, instalado, ...contexto })
    gravar(K_PRIMEIRO, new Date().toISOString().slice(0, 10))
  }
  evento('app_aberto', { instalado, origem, ...contexto })
  window.addEventListener('appinstalled', () => evento('app_instalado'))
  window.addEventListener('error', (e) => registrarErro('global', e.error ?? e))
  window.addEventListener('unhandledrejection', (e) => registrarErro('promessa', e.reason))
  window.addEventListener('online', () => void enviar())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void enviar(true)
  })
}
