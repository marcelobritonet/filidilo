// Ofensiva: dias seguidos com pelo menos uma sessão concluída (chegar à tela de fim; sair pelo X não conta).
// Folgas (no máximo 2) cobrem dias sem estudo. As regras são puras; as funções do fim leem e gravam no aparelho.
import { db } from './db'

/** Dia no fuso do aparelho, como "2026-11-21". */
export function diaLocal(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Anda n dias no calendário a partir de um dia "AAAA-MM-DD" (meio-dia, para não tropeçar no horário de verão). */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  return diaLocal(new Date(a, m - 1, d + n, 12).getTime())
}

export const MAX_FOLGAS = 2
/** A cada tantos dias seguidos, uma folga. */
export const DIAS_POR_FOLGA = 7
/** Nas últimas horas do dia, o fio e a chama piscam. */
export const HORAS_URGENTE = 3
/** Guarda só os dias do último ano e pouco: basta para a tela e mantém o registro pequeno. */
const DIAS_GUARDADOS = 400

export type MotivoFolga = 'baralho' | 'ia' | 'semana'

export interface Ofensiva {
  /** Dias com sessão concluída. */
  concluidos: string[]
  /** Dias cobertos por folga. */
  salvos: string[]
  folgas: number
  /** Último dia em que cada motivo deu folga (no máximo uma por dia para cada motivo). */
  ganhos: Partial<Record<MotivoFolga, string>>
  /** Último dia coberto cuja continuação já foi decidida (folga gasta ou ofensiva perdida). */
  avaliado?: string
}

export const vazia = (): Ofensiva => ({ concluidos: [], salvos: [], folgas: 0, ganhos: {} })

const cobertos = (o: Ofensiva) => new Set([...o.concluidos, ...o.salvos])

/** Dias seguidos cobertos terminando em `fim`. */
function contarAte(c: Set<string>, fim: string): number {
  let n = 0
  for (let d = fim; c.has(d); d = somarDias(d, -1)) n++
  return n
}

/** Dias seguidos até hoje. Se hoje ainda falta, conta até ontem: só cai depois de um dia inteiro sem sessão. */
export function sequencia(o: Ofensiva, hoje: string): number {
  const c = cobertos(o)
  return contarAte(c, c.has(hoje) ? hoje : somarDias(hoje, -1))
}

export interface Atualizacao {
  ofensiva: Ofensiva
  /** Folgas gastas agora. */
  usadas: number
  /** Tamanho da ofensiva que acabou de cair (0 se não caiu). */
  perdida: number
}

/**
 * Decide os dias sem estudo entre o último dia coberto e ontem: se as folgas dão para todos, gasta;
 * senão, a ofensiva cai (e as folgas ficam guardadas para a próxima).
 */
export function atualizar(o: Ofensiva, hoje: string): Atualizacao {
  const c = cobertos(o)
  const ontem = somarDias(hoje, -1)
  const ultimo = [...c].filter((d) => d < hoje).sort().pop()
  if (!ultimo || ultimo >= ontem || o.avaliado === ultimo) return { ofensiva: o, usadas: 0, perdida: 0 }
  const antes = contarAte(c, ultimo)
  const faltas: string[] = []
  for (let d = somarDias(ultimo, 1); d <= ontem; d = somarDias(d, 1)) faltas.push(d)
  if (faltas.length <= o.folgas)
    return { ofensiva: { ...o, salvos: [...o.salvos, ...faltas], folgas: o.folgas - faltas.length, avaliado: ontem }, usadas: faltas.length, perdida: 0 }
  return { ofensiva: { ...o, avaliado: ultimo }, usadas: 0, perdida: antes }
}

/** Ganha uma folga, se ainda cabe e se este motivo não deu folga hoje. */
export function ganhar(o: Ofensiva, motivo: MotivoFolga, hoje: string): { ofensiva: Ofensiva; ganhou: boolean } {
  if (o.folgas >= MAX_FOLGAS || o.ganhos[motivo] === hoje) return { ofensiva: o, ganhou: false }
  return { ofensiva: { ...o, folgas: o.folgas + 1, ganhos: { ...o.ganhos, [motivo]: hoje } }, ganhou: true }
}

export interface Conclusao extends Atualizacao {
  sequencia: number
  /** Primeira sessão concluída hoje (a que garante o dia). */
  primeiraHoje: boolean
  /** Ganhou a folga dos 7 dias seguidos. */
  folgaGanha: boolean
}

/** Marca hoje como concluído (depois de decidir os dias que faltaram). */
export function concluir(o: Ofensiva, hoje: string): Conclusao {
  const a = atualizar(o, hoje)
  let x = a.ofensiva
  const primeiraHoje = !x.concluidos.includes(hoje)
  if (primeiraHoje) x = { ...x, concluidos: [...x.concluidos, hoje].filter((d) => d > somarDias(hoje, -DIAS_GUARDADOS)) }
  const seq = sequencia(x, hoje)
  let folgaGanha = false
  if (primeiraHoje && seq % DIAS_POR_FOLGA === 0) ({ ofensiva: x, ganhou: folgaGanha } = ganhar(x, 'semana', hoje))
  return { ...a, ofensiva: x, sequencia: seq, primeiraHoje, folgaGanha }
}

export type EstadoDia = 'sessao' | 'folga' | 'falta' | 'hoje'

const LETRA_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Os últimos 7 dias, do mais antigo a hoje. `hoje` = hoje ainda sem sessão. */
export function semana(o: Ofensiva, hoje: string): { dia: string; rotulo: string; estado: EstadoDia }[] {
  const conc = new Set(o.concluidos)
  const salv = new Set(o.salvos)
  return Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(hoje, i - 6)
    const [a, m, d] = dia.split('-').map(Number)
    const estado: EstadoDia = conc.has(dia) ? 'sessao' : salv.has(dia) ? 'folga' : dia === hoje ? 'hoje' : 'falta'
    return { dia, rotulo: LETRA_DIA[new Date(a, m - 1, d, 12).getDay()], estado }
  })
}

/** Quanto do dia ainda resta (1 à meia-noite que começa o dia, 0 à que termina). */
export function fracaoRestante(agora: number): number {
  const d = new Date(agora)
  const fim = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.max(0, Math.min(1, (fim - agora) / (fim - inicio)))
}

/** Milissegundos até a meia-noite. */
export function restanteMs(agora: number): number {
  const d = new Date(agora)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - agora
}

export const urgente = (agora: number) => restanteMs(agora) <= HORAS_URGENTE * 3600000

/** "5 h", "1 h 30 min", "40 min". */
export function textoRestante(agora: number): string {
  const min = Math.ceil(restanteMs(agora) / 60000)
  if (min < 60) return `${min} min`
  // Perto do fim, os minutos importam: "1 h 30 min".
  if (min < 120 && min % 60) return `1 h ${min % 60} min`
  return `${Math.floor(min / 60)} h`
}

/** Lê o registro guardado; aceita só o formato certo. */
export function lerRegistro(valor: string | undefined): Ofensiva | null {
  if (!valor) return null
  try {
    const x = JSON.parse(valor) as Partial<Ofensiva>
    const dias = (l: unknown) => (Array.isArray(l) ? l.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [])
    return {
      concluidos: dias(x.concluidos),
      salvos: dias(x.salvos),
      folgas: Math.max(0, Math.min(MAX_FOLGAS, Math.floor(Number(x.folgas) || 0))),
      ganhos: typeof x.ganhos === 'object' && x.ganhos ? x.ganhos : {},
      avaliado: typeof x.avaliado === 'string' ? x.avaliado : undefined,
    }
  } catch {
    return vazia()
  }
}

/** Junta dois registros (backup): todos os dias de cada um; das folgas, a maior. */
export function juntar(a: Ofensiva, b: Ofensiva): Ofensiva {
  const u = (x: string[], y: string[]) => [...new Set([...x, ...y])].sort()
  const salvos = u(a.salvos, b.salvos)
  const concluidos = u(a.concluidos, b.concluidos)
  return { concluidos, salvos: salvos.filter((d) => !concluidos.includes(d)), folgas: Math.max(a.folgas, b.folgas), ganhos: { ...b.ganhos, ...a.ganhos } }
}

// ── No aparelho ─────────────────────────────────────────────────────────────

export const CHAVE_OFENSIVA = 'ofensiva'

const gravar = (o: Ofensiva) => db.meta.put({ chave: CHAVE_OFENSIVA, valor: JSON.stringify(o) })

/**
 * Lê a ofensiva. Na primeira vez, os dias que já têm respostas contam como concluídos,
 * para quem já estudava não começar do zero.
 */
export async function lerOfensiva(agora = Date.now()): Promise<Ofensiva> {
  const salvo = lerRegistro((await db.meta.get(CHAVE_OFENSIVA))?.valor)
  if (salvo) return salvo
  const desde = agora - DIAS_GUARDADOS * 86400000
  const revisoes = await db.revisoes.where('data').above(desde).toArray()
  const o: Ofensiva = { ...vazia(), concluidos: [...new Set(revisoes.map((r) => diaLocal(r.data)))].sort() }
  await gravar(o)
  return o
}

export interface Painel {
  sequencia: number
  hojeFeito: boolean
  folgas: number
  semana: ReturnType<typeof semana>
  usadas: number
  perdida: number
}

/** Para Meus baralhos: decide os dias que faltaram e devolve o que mostrar. */
export async function painelOfensiva(agora = Date.now()): Promise<Painel> {
  const hoje = diaLocal(agora)
  const antes = await lerOfensiva(agora)
  const a = atualizar(antes, hoje)
  if (a.ofensiva !== antes) await gravar(a.ofensiva)
  const o = a.ofensiva
  return { sequencia: sequencia(o, hoje), hojeFeito: o.concluidos.includes(hoje), folgas: o.folgas, semana: semana(o, hoje), usadas: a.usadas, perdida: a.perdida }
}

/** No fim da sessão. */
export async function concluirSessao(agora = Date.now()): Promise<Conclusao> {
  const r = concluir(await lerOfensiva(agora), diaLocal(agora))
  await gravar(r.ofensiva)
  return r
}

/** Ao criar baralho ou cartões com IA. Devolve as folgas guardadas, se ganhou uma. */
export async function ganharFolga(motivo: MotivoFolga, agora = Date.now()): Promise<number | null> {
  const r = ganhar(await lerOfensiva(agora), motivo, diaLocal(agora))
  if (!r.ganhou) return null
  await gravar(r.ofensiva)
  return r.ofensiva.folgas
}

/** Sequência de agora, só leitura (para as conquistas). */
export async function sequenciaAtual(agora = Date.now()): Promise<number> {
  return sequencia(await lerOfensiva(agora), diaLocal(agora))
}

// ── Selo de Meus baralhos ───────────────────────────────────────────────────

/** O que o selo já mostrou aberto: ele fica fechado até o dia virar ou algo disto mudar. */
export interface VistoSelo {
  dia: string
  sequencia: number
  hojeFeito: boolean
  folgas: number
}

export const vistoDoPainel = (p: Pick<Painel, 'sequencia' | 'hojeFeito' | 'folgas'>, hoje: string): VistoSelo => ({
  dia: hoje,
  sequencia: p.sequencia,
  hojeFeito: p.hojeFeito,
  folgas: p.folgas,
})

/** Abre na primeira vez do dia ou quando a sequência, o dia garantido ou as folgas mudaram. */
export function deveAbrirSelo(visto: VistoSelo | null, p: Pick<Painel, 'sequencia' | 'hojeFeito' | 'folgas'>, hoje: string): boolean {
  if (!visto) return true
  return visto.dia !== hoje || visto.sequencia !== p.sequencia || visto.hojeFeito !== p.hojeFeito || visto.folgas !== p.folgas
}

/** Lê o registro do selo; formato errado conta como nunca visto. */
export function lerVistoSelo(valor: string | null): VistoSelo | null {
  if (!valor) return null
  try {
    const x = JSON.parse(valor) as Partial<VistoSelo>
    if (typeof x.dia !== 'string' || typeof x.sequencia !== 'number' || typeof x.hojeFeito !== 'boolean' || typeof x.folgas !== 'number') return null
    return { dia: x.dia, sequencia: x.sequencia, hojeFeito: x.hojeFeito, folgas: x.folgas }
  } catch {
    return null
  }
}
