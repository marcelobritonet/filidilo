// Lê a resposta da IA: extrai o JSON, ajusta temas e ids e valida cartão a cartão.
import { problemasDoCartao, novoIdCartao } from '../cartoes'
import { normalizarNivel, type Baralho, type Cartao, type Objetivo, type Tema } from '../types'

export interface CartaoLido {
  cartao: Cartao
  /** Id que a IA deu (para o pedido de correção). */
  idIA: string
  erros: string[]
}

export interface RespostaLida {
  temasNovos: Tema[]
  cartoes: CartaoLido[]
}

/** Acha o JSON na resposta: dentro de ```json … ```, ou do primeiro { ao último }. */
export function extrairJson(texto: string): unknown {
  const t = texto.trim()
  if (!t) throw new Error('A resposta está vazia. Cole a resposta inteira da IA.')
  const blocos = [...t.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1].trim())
  const candidatos = blocos.length ? blocos : [t]
  let cortado = false
  for (const c of candidatos) {
    const ini = c.search(/[[{]/)
    if (ini < 0) continue
    if (faltaFechar(consertar(c.slice(ini)))) cortado = true
    const fim = Math.max(c.lastIndexOf('}'), c.lastIndexOf(']'))
    if (fim <= ini) continue
    const bruto = c.slice(ini, fim + 1)
    for (const tentativa of [bruto, consertar(bruto)]) {
      try {
        return JSON.parse(tentativa)
      } catch {
        /* tenta a próxima */
      }
    }
  }
  if (cortado) throw new Error('A resposta parece cortada no meio. Peça à IA para mandar o resto em outro bloco, ou menos cartões de cada vez.')
  throw new Error('Não encontrei um JSON válido na resposta. Copie a resposta inteira da IA (o bloco de código, não o texto formatado).')
}

const ENTIDADES: Record<string, string> = { nbsp: ' ', quot: '"', amp: '&', lt: '<', gt: '>', apos: "'" }
/** Pontuação que o Markdown escapa com barra (\_ \* \[ …) e que não é escape de JSON. */
const ESCAPE_MD = '_*[]#-.()!+<>{}|~`$'

/**
 * Consertos para respostas que passaram por formatação (cópia do ChatGPT fora do bloco, por exemplo):
 * entidades HTML (&#x20;), espaços especiais e invisíveis, aspas tipográficas, escapes de Markdown (\_),
 * barra simples de LaTeX (\Delta), quebra de linha crua dentro de texto e vírgula sobrando.
 * Só roda quando o JSON não abre direto, então uma resposta boa não muda.
 */
export function consertar(s: string): string {
  const t = s
    .replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (m, hex, dec, nome) => {
      if (hex || dec) {
        const n = parseInt(hex ?? dec, hex ? 16 : 10)
        return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m
      }
      return ENTIDADES[nome.toLowerCase()] ?? m
    })
    .replace(/[  ]/g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[“”]/g, '"')
  let out = ''
  let dentro = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (ch === '\\') {
      const nx = t[i + 1]
      if (nx === undefined) break
      const valido = nx === '"' || nx === '\\' || nx === '/' || 'bfnrt'.includes(nx) || (nx === 'u' && /^[0-9a-f]{4}$/i.test(t.slice(i + 2, i + 6)))
      if (dentro && valido) {
        out += ch + nx
        i++
      } else if (ESCAPE_MD.includes(nx)) {
        out += nx
        i++
      } else if (dentro) out += '\\\\' // barra solta (LaTeX \Delta): dobra; o caractere seguinte segue normal
      continue
    }
    if (ch === '"') dentro = !dentro
    if (dentro && ch === '\n') out += '\\n'
    else if (dentro && ch === '\t') out += '\\t'
    else if (!(dentro && ch === '\r')) out += ch
  }
  return out.replace(/,\s*([}\]])/g, '$1')
}

/** Abre mais chaves e colchetes do que fecha (fora dos textos)? Sinal de resposta cortada. */
function faltaFechar(s: string): boolean {
  let nivel = 0
  let dentro = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (dentro) {
      if (ch === '\\') i++
      else if (ch === '"') dentro = false
    } else if (ch === '"') dentro = true
    else if (ch === '{' || ch === '[') nivel++
    else if (ch === '}' || ch === ']') nivel--
  }
  return nivel > 0 || dentro
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'geral'

/**
 * Converte o JSON da IA em cartões do baralho de destino:
 * - temas: reaproveita os existentes (por id ou nome) e cria os novos;
 * - ids novos e únicos; `origem: "ia"`; fonte padrão quando faltar;
 * - cada cartão validado separadamente (um cartão ruim não derruba os outros).
 */
export function lerResposta(dados: unknown, destino: Pick<Baralho, 'id' | 'titulo' | 'versao' | 'temas'>, fontePadrao?: string): RespostaLida {
  const d = dados as { temas?: unknown; cartoes?: unknown; cards?: unknown } | unknown[]
  const lista = (Array.isArray(d) ? d : (d.cartoes ?? d.cards)) as unknown
  if (!Array.isArray(lista) || !lista.length) throw new Error('A resposta não tem uma lista "cartoes".')
  const temasIA = (!Array.isArray(d) && Array.isArray(d.temas) ? d.temas : []) as Partial<Tema>[]

  // Mapa de tema da IA → id final.
  const temas = [...destino.temas]
  const temasNovos: Tema[] = []
  const porChave = new Map<string, string>()
  for (const t of temas) {
    porChave.set(t.id, t.id)
    porChave.set(slug(t.nome), t.id)
  }
  const resolverTema = (id: string | undefined, nome?: string): string => {
    const chaves = [id, id && slug(id), nome && slug(nome)].filter(Boolean) as string[]
    for (const k of chaves) if (porChave.has(k)) return porChave.get(k)!
    const novo: Tema = { id: slug(id || nome || 'geral'), nome: (nome || id || 'Geral').trim() }
    let n = 2
    while (temas.some((t) => t.id === novo.id)) novo.id = `${slug(id || nome || 'geral')}-${n++}`
    temas.push(novo)
    temasNovos.push(novo)
    for (const k of chaves) porChave.set(k, novo.id)
    return novo.id
  }
  for (const t of temasIA) {
    if (!t?.id && !t?.nome) continue
    const id = resolverTema(t.id, t.nome)
    const novo = temasNovos.find((x) => x.id === id)
    if (novo && typeof t.descricao === 'string' && t.descricao.trim()) novo.descricao = t.descricao.trim()
  }

  const baralhoTeste: Baralho = { ...destino, temas, cartoes: [] }
  const cartoes: CartaoLido[] = (lista as Record<string, unknown>[]).map((bruto, i) => {
    const idIA = String(bruto?.id ?? `#${i + 1}`)
    const tema = resolverTema(typeof bruto?.tema === 'string' ? bruto.tema : undefined)
    const c = {
      ...bruto,
      id: novoIdCartao('ia'),
      tema,
      origem: 'ia',
      fonte: bruto?.fonte ?? (fontePadrao ? { apostila: fontePadrao } : undefined),
    } as Cartao
    if (c.tipo === 'associacao' && typeof c.outrasFormas === 'string') c.outrasFormas = [c.outrasFormas]
    if (c.tipo === 'vf' && typeof c.resposta === 'string') c.resposta = (c.resposta as string).toLowerCase() === 'true'
    baralhoTeste.temas = temas
    return { cartao: c, idIA, erros: problemasDoCartao(baralhoTeste, c) }
  })
  return { temasNovos, cartoes }
}

export interface PlanoLido extends RespostaLida {
  baralho: { titulo: string; objetivo?: Objetivo }
}

const aparar = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const lista = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 5)
    : []

/**
 * Lê o plano da instrução "Aprender": bloco `baralho` (com limites), temas e cartões.
 * Sem o bloco `baralho`, o título é o pedido cortado em 40 caracteres e não há objetivo.
 */
export function lerPlano(dados: unknown, pedido: string, fontePadrao = 'Gerado por IA'): PlanoLido {
  const d = (Array.isArray(dados) ? { cartoes: dados } : (dados ?? {})) as Record<string, unknown>
  const bruto = d.baralho && typeof d.baralho === 'object' ? (d.baralho as Record<string, unknown>) : undefined
  const pedidoLimpo = pedido.trim()
  const titulo = aparar(bruto?.titulo, 40) || pedidoLimpo.slice(0, 40).trim()

  let objetivo: Objetivo | undefined
  if (bruto) {
    const nivel = normalizarNivel(bruto.nivel)
    const foco = lista(bruto.foco)
    const evitar = lista(bruto.evitar)
    objetivo = { pedido: pedidoLimpo }
    const resumo = aparar(bruto.objetivo, 160)
    if (resumo) objetivo.resumo = resumo
    if (nivel) objetivo.nivel = nivel
    if (foco.length) objetivo.foco = foco
    if (evitar.length) objetivo.evitar = evitar
  }

  const temas = Array.isArray(d.temas)
    ? d.temas.map((t) => (t && typeof t === 'object' ? { ...(t as object), descricao: aparar((t as Record<string, unknown>).descricao, 120) || undefined } : t))
    : d.temas
  // O id só existe para o validador (que exige id e título); o baralho ainda não foi criado.
  const r = lerResposta({ ...d, temas }, { id: 'novo', titulo, versao: 1, temas: [] }, fontePadrao)
  return { baralho: objetivo ? { titulo, objetivo } : { titulo }, temasNovos: r.temasNovos, cartoes: r.cartoes }
}

/** A IA respondeu com perguntas (sem JSON) em vez do plano? */
export function parecePerguntas(texto: string): boolean {
  try {
    extrairJson(texto)
    return false
  } catch {
    /* sem JSON: vale checar as perguntas */
  }
  return texto.split(/\r?\n/).some((linha) => {
    const t = linha.trim()
    return t.endsWith('?') && t.length <= 200
  })
}
