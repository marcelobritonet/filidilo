// Sincronização entre aparelhos por código (P131), sem conta e sem login.
//
// O código é um segredo de 16 bytes criado no aparelho. Dele saem (HKDF-SHA256):
// - o endereço do cofre (32 hex), único dado que o servidor conhece;
// - a chave AES-GCM, que cifra tudo antes de sair do aparelho e nunca vai para o servidor;
// - a x-chave, que o servidor exige para gravar ou apagar o cofre (ele guarda só o hash dela).
// O cofre fica no worker filidilo-links (rotas /s/<endereço>, worker/src/sync.ts).
//
// Sincronizar = baixar o cofre, juntar com os dados daqui (mesclarTudo, a mesma junção do backup)
// e subir o resultado. A junção só acrescenta e as exclusões viajam como marca, então dois aparelhos
// sincronizando ao mesmo tempo não perdem nada: o próximo sync acerta.
import { instantaneo, mesclarTudo, type Backup } from './backup'
import { db } from './db'
import { URL_LINKS, URL_PUBLICA } from './link'
import { faixa } from './metricas'
import { evento } from './telemetria'

// ── Código ──────────────────────────────────────────────────────────────────

/** Bytes num ArrayBuffer comum (o que fetch, Blob e WebCrypto aceitam). */
type Bytes = Uint8Array<ArrayBuffer>

const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // base32 Crockford: sem I, L, O, U
const BYTES = 16
const LETRAS = 26 // 16 bytes = 128 bits = 26 letras de 5 bits (as 2 últimas sobram)

function paraBase32(b: Bytes): string {
  let bits = 0
  let valor = 0
  let out = ''
  for (const x of b) {
    valor = (valor << 8) | x
    bits += 8
    while (bits >= 5) {
      out += ALFABETO[(valor >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALFABETO[(valor << (5 - bits)) & 31]
  return out
}

function deBase32(s: string): Bytes | null {
  const out: number[] = []
  let bits = 0
  let valor = 0
  for (const ch of s) {
    const v = ALFABETO.indexOf(ch)
    if (v < 0) return null
    valor = ((valor << 5) | v) & 0xffff
    bits += 5
    if (bits >= 8) {
      out.push((valor >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return out.length >= BYTES ? new Uint8Array(out.slice(0, BYTES)) : null
}

/** Código guardado e mostrado: 26 letras, em grupos de 4 (`FILI-7K3M-Q9XA-…`). */
export function formatarCodigo(codigo: string): string {
  return ['FILI', ...(codigo.match(/.{1,4}/g) ?? [])].join('-')
}

/** Código novo, aleatório. */
export function criarCodigo(): string {
  return paraBase32(crypto.getRandomValues(new Uint8Array(BYTES)))
}

/**
 * Lê o código digitado ou vindo do link: aceita minúsculas, espaços, hífens e o prefixo FILI, e troca
 * as letras que se confundem (I e L viram 1, O vira 0). Devolve as 26 letras, ou null se não for um código.
 */
export function lerCodigo(texto: string): string | null {
  let s = texto.toUpperCase().replace(/[\s\-_.]/g, '')
  if (s.startsWith('FILI') && s.length === LETRAS + 4) s = s.slice(4)
  s = s.replace(/[IL]/g, '1').replace(/O/g, '0')
  if (s.length !== LETRAS || !deBase32(s)) return null
  return s
}

// ── Chaves ──────────────────────────────────────────────────────────────────

export interface Chaves {
  endereco: string
  xChave: string
  chave: CryptoKey
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const base64url = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const texto = (s: string) => new TextEncoder().encode(s)

export async function derivar(codigo: string): Promise<Chaves> {
  const bytes = deBase32(codigo)
  if (!bytes) throw new Error('codigo_invalido')
  const base = await crypto.subtle.importKey('raw', bytes, 'HKDF', false, ['deriveBits', 'deriveKey'])
  const hkdf = (info: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: texto('filidilo-sync'), info: texto(info) })
  const [endereco, xChave, chave] = await Promise.all([
    crypto.subtle.deriveBits(hkdf('endereco'), base, 128),
    crypto.subtle.deriveBits(hkdf('x-chave'), base, 256),
    crypto.subtle.deriveKey(hkdf('chave'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
  ])
  return { endereco: hex(endereco), xChave: base64url(xChave), chave }
}

// ── Cifra ───────────────────────────────────────────────────────────────────
// Cofre = [versão 1][flags][iv 12 bytes][conteúdo cifrado]. Flag 1: o conteúdo foi compactado (gzip).

const VERSAO = 1
const GZIP = 1

async function passar(dados: Bytes, t: CompressionStream | DecompressionStream): Promise<Bytes> {
  const s = new Blob([dados]).stream().pipeThrough(t)
  return new Uint8Array(await new Response(s).arrayBuffer())
}

export async function cifrar(dados: unknown, chave: CryptoKey): Promise<Bytes> {
  let corpo = texto(JSON.stringify(dados))
  let flags = 0
  if (typeof CompressionStream !== 'undefined') {
    corpo = await passar(corpo, new CompressionStream('gzip'))
    flags |= GZIP
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, corpo))
  const out = new Uint8Array(2 + 12 + cifrado.length)
  out[0] = VERSAO
  out[1] = flags
  out.set(iv, 2)
  out.set(cifrado, 14)
  return out
}

export async function decifrar(cofre: Bytes, chave: CryptoKey): Promise<unknown> {
  if (cofre.length < 15 || cofre[0] !== VERSAO) throw new Error('cifra')
  let corpo: Bytes
  try {
    corpo = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: cofre.slice(2, 14) }, chave, cofre.slice(14)))
  } catch {
    throw new Error('cifra')
  }
  if (cofre[1] & GZIP) corpo = await passar(corpo, new DecompressionStream('gzip'))
  return JSON.parse(new TextDecoder().decode(corpo))
}

// ── Estado neste aparelho ───────────────────────────────────────────────────

/** Por que o sync falhou (vai nas estatísticas e escolhe a mensagem). */
export type Motivo = 'offline' | 'codigo_invalido' | 'nao_encontrado' | 'grande' | 'limite' | 'recusado' | 'rede' | 'cifra' | 'desligado'

export interface EstadoSync {
  /** As 26 letras do código. Fica só neste aparelho: não vai no backup nem no cofre. */
  codigo: string
  ultimaSync?: number
  /** Há mudança daqui que ainda não subiu (faltou internet ou deu erro). */
  pendente?: boolean
  erro?: Motivo
}

export const CHAVE_SYNC = 'sync'

export async function lerEstado(): Promise<EstadoSync | null> {
  const m = await db.meta.get(CHAVE_SYNC)
  try {
    const e = m && (JSON.parse(m.valor) as EstadoSync)
    return e && typeof e.codigo === 'string' && lerCodigo(e.codigo) ? e : null
  } catch {
    return null
  }
}

const ouvintes = new Set<(e: EstadoSync | null, sincronizando: boolean) => void>()
let sincronizando = false

/** Avisa a interface quando o estado muda (ícone do cabeçalho e tela Sincronizar). Devolve como parar. */
export function ouvirSync(f: (e: EstadoSync | null, sincronizando: boolean) => void): () => void {
  ouvintes.add(f)
  void lerEstado().then((e) => f(e, sincronizando))
  return () => ouvintes.delete(f)
}

async function avisar() {
  const e = await lerEstado()
  for (const f of ouvintes) f(e, sincronizando)
}

async function gravarEstado(e: EstadoSync | null) {
  if (e) await db.meta.put({ chave: CHAVE_SYNC, valor: JSON.stringify(e) })
  else await db.meta.delete(CHAVE_SYNC)
  await avisar()
}

// ── Servidor ────────────────────────────────────────────────────────────────

export const syncDisponivel = () => !!URL_LINKS

class ErroSync extends Error {
  constructor(public motivo: Motivo) {
    super(motivo)
  }
}

const porStatus = (s: number): Motivo => (s === 404 ? 'nao_encontrado' : s === 413 ? 'grande' : s === 429 ? 'limite' : s === 403 ? 'recusado' : 'rede')

async function pedir(f: typeof fetch, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await f(url, init)
  } catch {
    throw new ErroSync(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'rede')
  }
}

async function baixar(c: Chaves, f: typeof fetch): Promise<Bytes | null> {
  const r = await pedir(f, `${URL_LINKS}/s/${c.endereco}`)
  if (r.status === 404) return null
  if (!r.ok) throw new ErroSync(porStatus(r.status))
  return new Uint8Array(await r.arrayBuffer())
}

async function subir(c: Chaves, dados: Bytes, f: typeof fetch): Promise<void> {
  const r = await pedir(f, `${URL_LINKS}/s/${c.endereco}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-chave': c.xChave }, body: dados })
  if (!r.ok) throw new ErroSync(porStatus(r.status))
}

async function apagar(c: Chaves, f: typeof fetch): Promise<void> {
  const r = await pedir(f, `${URL_LINKS}/s/${c.endereco}`, { method: 'DELETE', headers: { 'x-chave': c.xChave } })
  if (!r.ok && r.status !== 404) throw new ErroSync(porStatus(r.status))
}

// ── Sincronizar ─────────────────────────────────────────────────────────────

export type Gatilho = 'botao' | 'abrir' | 'sessao' | 'ligar' | 'trocar'

export interface Resultado {
  ok: boolean
  motivo?: Motivo
  /** Quantas coisas novas vieram do outro aparelho (respostas, estados, baralhos). */
  baixou?: number
  /** Se o cofre foi regravado (havia novidade daqui). */
  subiu?: boolean
}

const semData = (b: Backup) => JSON.stringify({ ...b, data: '' })

/**
 * Baixa, junta e sobe. `criar`: o cofre ainda não existe (primeiro aparelho); sem ele, cofre que
 * não existe é erro (o código foi trocado em outro aparelho, ou venceu depois de um ano parado).
 */
async function rodar(codigo: string, gatilho: Gatilho, f: typeof fetch, criar = false): Promise<Resultado> {
  const t0 = Date.now()
  const c = await derivar(codigo)
  const bruto = await baixar(c, f)
  if (!bruto && !criar) throw new ErroSync('nao_encontrado')
  let remoto: Backup | null = null
  let baixou = 0
  if (bruto) {
    remoto = (await decifrar(bruto, c.chave)) as Backup
    const j = await mesclarTudo(remoto)
    baixou = j.estados + j.revisoes + j.baralhos + j.removidos
  }
  const daqui = await instantaneo()
  // Nada de novo deste lado: não regrava (cada gravação conta no limite diário do Cloudflare).
  const subiu = !remoto || semData(remoto) !== semData(daqui)
  let tamanho = 0
  if (subiu) {
    const cofre = await cifrar(daqui, c.chave)
    tamanho = cofre.length
    await subir(c, cofre, f)
  }
  evento('sync_feito', {
    gatilho,
    baixou: faixa(baixou, [5, 20, 100, 500]),
    subiu,
    tamanho: faixa(Math.ceil(tamanho / 1024), [10, 50, 200, 1000]),
    ms: faixa(Date.now() - t0, [500, 2000, 5000, 15000]),
  })
  return { ok: true, baixou, subiu }
}

let emAndamento: Promise<Resultado> | null = null

/**
 * Sincroniza, se este aparelho estiver ligado. Uma de cada vez: quem chama durante outra recebe a
 * mesma. Nunca lança: devolve o resultado e grava o estado (o ícone mostra pendente ou erro).
 */
export function sincronizar(gatilho: Gatilho, f: typeof fetch = fetch): Promise<Resultado> {
  if (emAndamento) return emAndamento
  const vez = (async (): Promise<Resultado> => {
    const e = await lerEstado()
    if (!e || !syncDisponivel()) return { ok: false, motivo: 'desligado' }
    sincronizando = true
    await avisar()
    try {
      const r = await rodar(e.codigo, gatilho, f)
      await gravarEstado({ codigo: e.codigo, ultimaSync: Date.now() })
      return r
    } catch (err) {
      const motivo = err instanceof ErroSync ? err.motivo : err instanceof Error && err.message === 'cifra' ? 'cifra' : 'rede'
      // Sem internet no automático é o esperado: não vira estatística.
      if (!(motivo === 'offline' && gatilho !== 'botao')) evento('sync_erro', { gatilho, motivo })
      await gravarEstado({ ...e, pendente: true, erro: motivo })
      return { ok: false, motivo }
    } finally {
      sincronizando = false
      await avisar()
    }
  })().finally(() => {
    emAndamento = null
  })
  emAndamento = vez
  return vez
}

/** Este aparelho passa a ser o primeiro: cria o código e o cofre. */
export async function comecar(f: typeof fetch = fetch): Promise<Resultado> {
  const codigo = criarCodigo()
  try {
    const r = await rodar(codigo, 'ligar', f, true)
    await gravarEstado({ codigo, ultimaSync: Date.now() })
    evento('sync_ligado', { como: 'novo' })
    return r
  } catch (err) {
    const motivo = err instanceof ErroSync ? err.motivo : 'rede'
    evento('sync_erro', { gatilho: 'ligar', motivo })
    return { ok: false, motivo }
  }
}

/** Liga este aparelho a um cofre que já existe (código digitado ou do QR). Os dados daqui se juntam aos de lá. */
export async function ligar(textoDoCodigo: string, como: 'codigo' | 'qr', f: typeof fetch = fetch): Promise<Resultado> {
  const codigo = lerCodigo(textoDoCodigo)
  const falhar = (motivo: Motivo): Resultado => {
    evento('sync_erro', { gatilho: 'ligar', motivo })
    return { ok: false, motivo }
  }
  if (!codigo) return falhar('codigo_invalido')
  try {
    const r = await rodar(codigo, 'ligar', f)
    await gravarEstado({ codigo, ultimaSync: Date.now() })
    evento('sync_ligado', { como })
    return r
  } catch (err) {
    return falhar(err instanceof ErroSync ? err.motivo : err instanceof Error && err.message === 'cifra' ? 'cifra' : 'rede')
  }
}

/**
 * Troca o código: cria um cofre novo com tudo e apaga o antigo. Quem tinha o código velho perde o
 * acesso, inclusive os outros aparelhos (que precisam ser ligados de novo com o código novo).
 */
export async function trocarCodigo(f: typeof fetch = fetch): Promise<Resultado> {
  const e = await lerEstado()
  if (!e) return { ok: false, motivo: 'desligado' }
  try {
    // Primeiro pega as novidades do cofre velho, para não perder nada.
    await rodar(e.codigo, 'trocar', f).catch((err) => {
      if (!(err instanceof ErroSync && err.motivo === 'nao_encontrado')) throw err
    })
    const novo = criarCodigo()
    const r = await rodar(novo, 'trocar', f, true)
    await gravarEstado({ codigo: novo, ultimaSync: Date.now() })
    await apagar(await derivar(e.codigo), f).catch(() => undefined)
    evento('sync_codigo_trocado')
    return r
  } catch (err) {
    const motivo = err instanceof ErroSync ? err.motivo : 'rede'
    evento('sync_erro', { gatilho: 'trocar', motivo })
    return { ok: false, motivo }
  }
}

/** Este aparelho para de sincronizar. Os dados daqui ficam; o cofre continua para os outros aparelhos. */
export async function desligar(): Promise<void> {
  await gravarEstado(null)
  evento('sync_desligado')
}

// ── Link do QR ──────────────────────────────────────────────────────────────

/**
 * Link que liga outro aparelho. O código vai depois do # (nunca sai do navegador para servidor nenhum).
 * A página pública responde com 302 para o app, e o navegador mantém o #.
 */
export function linkDoCodigo(codigo: string, origem = location.origin, base = import.meta.env.BASE_URL, publica = URL_PUBLICA): string {
  return `${publica || origem + base.replace(/\/+$/, '')}/#sync=${codigo}`
}

/** Lê `#sync=<código>` do endereço e o tira dali na hora (para não ficar no histórico nem ir junto num compartilhamento). */
export function pegarCodigoDaUrl(): string | null {
  const m = /^#sync=([^&]+)/.exec(location.hash)
  if (!m) return null
  history.replaceState(history.state, '', location.pathname + location.search)
  return lerCodigo(decodeURIComponent(m[1]))
}

/** Mensagem em português para cada motivo. */
export function mensagemDoMotivo(m: Motivo): string {
  switch (m) {
    case 'offline':
      return 'Sem internet agora. As novidades sobem quando a conexão voltar.'
    case 'codigo_invalido':
      return 'Esse código não está certo. Confira as letras e tente de novo.'
    case 'nao_encontrado':
      return 'Não achei esse código. Ele pode ter sido trocado em outro aparelho. Peça o código novo e ligue de novo.'
    case 'grande':
      return 'Seus dados ficaram grandes demais para sincronizar. Use o backup em arquivo.'
    case 'limite':
      return 'Muitas sincronizações em pouco tempo. Espere um minuto.'
    case 'recusado':
      return 'O servidor recusou este código. Ligue este aparelho de novo.'
    case 'cifra':
      return 'Não consegui abrir os dados com esse código.'
    case 'desligado':
      return 'Este aparelho não está sincronizando.'
    default:
      return 'Não consegui sincronizar agora. Tente de novo daqui a pouco.'
  }
}
