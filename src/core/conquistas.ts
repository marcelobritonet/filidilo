// Sequência de dias, resumo da semana e marcos, calculados das respostas guardadas (db.revisoes).
// As regras são puras (recebem os dados); as funções do fim do arquivo leem e gravam no aparelho.
import { db, type Revisao } from './db'
import { chave, dominado } from './srs'
import type { Baralho } from './types'

/** Dia no fuso do aparelho, como "2026-11-21". */
export function diaLocal(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Volta n dias no calendário (meio-dia, para não tropeçar no horário de verão). */
function diaAntes(t: number, n: number): number {
  const d = new Date(t)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.getTime()
}

/**
 * Dias seguidos estudando, até hoje. Se ainda não estudou hoje, a sequência de ontem continua valendo
 * (só quebra quando passa um dia inteiro sem nenhuma resposta).
 */
export function diasSeguidos(datas: number[], agora = Date.now()): number {
  const dias = new Set(datas.map(diaLocal))
  let n = dias.has(diaLocal(agora)) ? 0 : 1
  if (n === 1 && !dias.has(diaLocal(diaAntes(agora, 1)))) return 0
  let seguidos = 0
  while (dias.has(diaLocal(diaAntes(agora, n)))) {
    seguidos++
    n++
  }
  return seguidos
}

export interface Semana {
  /** Os últimos 7 dias, do mais antigo a hoje. */
  dias: { rotulo: string; estudou: boolean }[]
  diasEstudados: number
  respostas: number
  acertos: number
  /** Ids dos baralhos estudados na semana. */
  baralhos: string[]
}

const LETRA_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Resumo dos últimos 7 dias (hoje incluído). */
export function resumoSemana(revisoes: Pick<Revisao, 'data' | 'nota' | 'cartao'>[], agora = Date.now()): Semana {
  const janela = Array.from({ length: 7 }, (_, i) => diaAntes(agora, 6 - i))
  const chaves = new Set(janela.map(diaLocal))
  const daSemana = revisoes.filter((r) => chaves.has(diaLocal(r.data)))
  const estudados = new Set(daSemana.map((r) => diaLocal(r.data)))
  const dias = janela.map((t) => ({ rotulo: LETRA_DIA[new Date(t).getDay()], estudou: estudados.has(diaLocal(t)) }))
  return {
    dias,
    diasEstudados: estudados.size,
    respostas: daSemana.length,
    acertos: daSemana.filter((r) => r.nota >= 3).length,
    baralhos: [...new Set(daSemana.map((r) => r.cartao.split('/')[0]))],
  }
}

export type TipoMarco = 'primeira_sessao' | 'sequencia' | 'respostas' | 'meta' | 'dominado'

export interface Marco {
  id: string
  tipo: TipoMarco
  /** Número grande da comemoração ("7"). */
  destaque: string
  /** Embaixo do número ("dias seguidos estudando"). */
  legenda: string
  /** Frase para a tela e o texto do compartilhamento. */
  frase: string
}

export const SEQUENCIAS = [3, 7, 14, 30, 60, 100]
export const RESPOSTAS = [100, 500, 1000, 5000]

/** Situação de agora, para saber quais marcos já foram atingidos. */
export interface Situacao {
  sequencia: number
  respostas: number
  /** Já bateu uma meta de acertos alguma vez (nesta sessão, pelo menos). */
  bateuMeta: boolean
  /** Baralhos com todos os cartões dominados (só os com 5 ou mais cartões). */
  dominados: { id: string; titulo: string; cartoes: number }[]
}

/** Todos os marcos atingidos, do mais importante para o menos. */
export function marcosAtingidos(s: Situacao): Marco[] {
  const l: Marco[] = []
  for (const b of s.dominados)
    l.push({ id: `dominado:${b.id}`, tipo: 'dominado', destaque: String(b.cartoes), legenda: 'cartões dominados', frase: `Dominei todos os ${b.cartoes} cartões de “${b.titulo}”` })
  for (const n of [...SEQUENCIAS].reverse())
    if (s.sequencia >= n) l.push({ id: `sequencia:${n}`, tipo: 'sequencia', destaque: String(n), legenda: 'dias seguidos estudando', frase: `${n} dias seguidos estudando` })
  for (const n of [...RESPOSTAS].reverse())
    if (s.respostas >= n) l.push({ id: `respostas:${n}`, tipo: 'respostas', destaque: n.toLocaleString('pt-BR'), legenda: 'cartões respondidos', frase: `${n.toLocaleString('pt-BR')} cartões respondidos` })
  if (s.bateuMeta) l.push({ id: 'meta', tipo: 'meta', destaque: '1ª', legenda: 'meta atingida', frase: 'Bati minha primeira meta de acertos' })
  if (s.respostas > 0) l.push({ id: 'primeira_sessao', tipo: 'primeira_sessao', destaque: '1ª', legenda: 'sessão de estudo', frase: 'Fiz minha primeira sessão de estudo' })
  return l
}

/**
 * Marcos para comemorar agora: os atingidos que ainda não foram comemorados.
 * Só o mais importante aparece; os outros novos também ficam como comemorados (sem enxurrada).
 */
export function marcoNovo(atingidos: Marco[], comemorados: Set<string>): { mostrar?: Marco; marcar: string[] } {
  const novos = atingidos.filter((m) => !comemorados.has(m.id))
  return { mostrar: novos[0], marcar: novos.map((m) => m.id) }
}

// ── No aparelho ─────────────────────────────────────────────────────────────

const CHAVE_MARCOS = 'marcos'

async function lerComemorados(): Promise<Set<string> | null> {
  const m = await db.meta.get(CHAVE_MARCOS)
  if (!m) return null
  try {
    return new Set(JSON.parse(m.valor) as string[])
  } catch {
    return new Set()
  }
}

const gravarComemorados = (s: Set<string>) => db.meta.put({ chave: CHAVE_MARCOS, valor: JSON.stringify([...s]) })

async function situacao(baralhos: Baralho[], bateuMeta = false): Promise<Situacao> {
  const [revisoes, estados] = await Promise.all([db.revisoes.toArray(), db.estados.toArray()])
  const m = new Map(estados.map((e) => [e.id, e]))
  return {
    sequencia: diasSeguidos(revisoes.map((r) => r.data)),
    respostas: revisoes.length,
    bateuMeta,
    dominados: baralhos
      .filter((b) => b.cartoes.length >= 5 && b.cartoes.every((c) => dominado(m.get(chave(b.id, c.id)))))
      .map((b) => ({ id: b.id, titulo: b.titulo, cartoes: b.cartoes.length })),
  }
}

/**
 * Na primeira vez que o app roda com marcos (ou depois de restaurar um backup), o que já foi atingido
 * fica como comemorado em silêncio: quem já estuda há tempo não ganha uma enxurrada de comemorações.
 */
export async function iniciarMarcos(baralhos: Baralho[]): Promise<void> {
  if (await lerComemorados()) return
  const ja = marcosAtingidos(await situacao(baralhos))
  await gravarComemorados(new Set(ja.map((m) => m.id)))
}

/** No fim da sessão: a sequência de agora e o marco novo (se houver), já marcado como comemorado. */
export async function fecharSessao(baralhos: Baralho[], bateuMeta: boolean): Promise<{ sequencia: number; marco?: Marco }> {
  const s = await situacao(baralhos, bateuMeta)
  const comemorados = (await lerComemorados()) ?? new Set<string>()
  const { mostrar, marcar } = marcoNovo(marcosAtingidos(s), comemorados)
  if (marcar.length) await gravarComemorados(new Set([...comemorados, ...marcar]))
  return { sequencia: s.sequencia, marco: mostrar }
}

/** Para Meus baralhos: sequência e semana. */
export async function painel(agora = Date.now()): Promise<{ sequencia: number; semana: Semana }> {
  // Sequências de mais de um ano contam até um ano: basta para a tela inicial.
  const revisoes = await db.revisoes.where('data').above(diaAntes(agora, 370)).toArray()
  return { sequencia: diasSeguidos(revisoes.map((r) => r.data), agora), semana: resumoSemana(revisoes, agora) }
}
