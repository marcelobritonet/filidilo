import type { Estado } from './db'
import type { Baralho, Cartao } from './types'
import { chave, vencido } from './srs'
import { aleatorio, embaralhar, inteiro } from './aleatorio'
import { diaLocal } from './ofensiva'

export type Filtro = 'tudo' | 'teoria' | 'calculo'

export interface OpcoesFila {
  temas?: string[] // vazio = todos
  filtro?: Filtro
  tamanho?: number
  /** Só os cartões nunca vistos (sem estado neste aparelho). */
  soNovos?: boolean
  /** Só os favoritos. */
  soFavoritos?: boolean
}


function candidatos(b: Baralho, o: OpcoesFila, estados?: Map<string, Estado>): Cartao[] {
  return b.cartoes.filter(
    (c) =>
      !c.arquivadoEm &&
      (!o.temas?.length || o.temas.includes(c.tema)) &&
      (!o.soNovos || !estados?.has(chave(b.id, c.id))) &&
      (!o.soFavoritos || !!c.favoritoEm) &&
      (o.filtro === 'calculo' ? c.tipo === 'calculo' : o.filtro === 'teoria' ? c.tipo !== 'calculo' : true),
  )
}

/** A cada quantos cartões entra um nunca visto, enquanto houver (o primeiro da fila já é um). */
export const NOVO_A_CADA = 2

/** Quantos cartões à frente se olha para trocar de tema sem bagunçar a prioridade da revisão. */
const JANELA = 6
const DIA = 86_400_000

/**
 * Fila do "Estudar". Antes de tudo, os favoritos ainda não respondidos hoje (até metade da sessão);
 * os que já foram respondidos hoje seguem o grupo normal deles. Depois, dois blocos:
 * 1. o que precisa: errados da última vez e vencidos hoje (repetição espaçada), alternando
 *    um a um com os nunca vistos, a começar por um nunca visto;
 * 2. depois de acabar o bloco 1: difíceis e acertados que ainda não venceram, os respondidos
 *    há mais dias primeiro, em ordem sorteada dentro do mesmo dia.
 * Em toda a fila os temas se revezam: entra o tema usado há mais tempo, nunca dois seguidos
 * do mesmo tema quando houver outro por perto.
 */
export function filaProva(b: Baralho, estados: Map<string, Estado>, o: OpcoesFila = {}, rng = aleatorio, agora = Date.now()): Cartao[] {
  const grupo = (c: Cartao) => {
    const e = estados.get(chave(b.id, c.id))
    if (!e) return 2
    if (e.ultimaNota === 1) return 0
    if (vencido(e, agora)) return 1
    return 3
  }
  const tamanho = o.tamanho ?? 20
  const hoje = diaLocal(agora)
  const fixado = (c: Cartao) => {
    const e = estados.get(chave(b.id, c.id))
    return !!c.favoritoEm && (!e || diaLocal(e.ultimaData) !== hoje)
  }
  const todos = candidatos(b, o, estados)
  const primeiros = embaralhar(todos.filter(fixado), rng).slice(0, Math.ceil(tamanho / 2))
  const naFrente = new Set(primeiros)
  const grupos: Cartao[][] = [[], [], [], []]
  for (const c of todos) if (!naFrente.has(c)) grupos[grupo(c)].push(c)
  const dia = (c: Cartao) => Math.floor((estados.get(chave(b.id, c.id))?.ultimaData ?? 0) / DIA)
  const precisa = [...embaralhar(grupos[0], rng), ...embaralhar(grupos[1], rng)]
  const novos = embaralhar(grupos[2], rng)
  const depois = embaralhar(grupos[3], rng).sort((x, y) => dia(x) - dia(y))

  const temas = new Temas()
  const out: Cartao[] = []
  while (primeiros.length) out.push(temas.tirar(primeiros, JANELA))
  while (precisa.length || novos.length) {
    const vezDoNovo = out.length % NOVO_A_CADA === 0
    if (novos.length && (vezDoNovo || !precisa.length)) out.push(temas.tirar(novos, novos.length))
    else out.push(temas.tirar(precisa, JANELA))
  }
  while (depois.length) out.push(temas.tirar(depois, JANELA))
  return out.slice(0, tamanho)
}

/** Revisão espaçada: cartões vencidos (FSRS) e até `novos` cartões novos. */
export function filaEspacada(b: Baralho, estados: Map<string, Estado>, o: OpcoesFila = {}, novos = 15): Cartao[] {
  const agora = Date.now()
  const cs = candidatos(b, o, estados)
  const vencidos = cs
    .filter((c) => estados.has(chave(b.id, c.id)) && vencido(estados.get(chave(b.id, c.id)), agora))
    .sort((x, y) => +new Date(estados.get(chave(b.id, x.id))!.fsrs.due) - +new Date(estados.get(chave(b.id, y.id))!.fsrs.due))
  const nunca = espalharTemas(embaralhar(cs.filter((c) => !estados.has(chave(b.id, c.id)))).slice(0, novos))
  return [...vencidos, ...nunca].slice(0, o.tamanho ?? 50)
}

/** Lembra onde cada tema apareceu por último e tira de uma lista o cartão do tema mais esquecido. */
class Temas {
  private ultimo = new Map<string, number>()
  private n = 0
  /** Entre os `janela` primeiros de `resto`, tira o de tema usado há mais tempo (empate: o primeiro). */
  tirar(resto: Cartao[], janela: number): Cartao {
    let melhor = 0
    let distancia = -1
    for (let i = 0; i < Math.min(janela, resto.length); i++) {
      const u = this.ultimo.get(resto[i].tema)
      const d = u === undefined ? Infinity : this.n - u
      if (d > distancia) {
        melhor = i
        distancia = d
      }
    }
    const [c] = resto.splice(melhor, 1)
    this.ultimo.set(c.tema, this.n++)
    return c
  }
}

/** Reveza os temas de uma lista cuja ordem não importa. */
function espalharTemas(cs: Cartao[]): Cartao[] {
  const resto = [...cs]
  const t = new Temas()
  const out: Cartao[] = []
  while (resto.length) out.push(t.tirar(resto, resto.length))
  return out
}

/** Próxima posição de um cartão errado na sessão: volta depois de 6 a 10 cartões. */
export const posicaoReinsercao = (atual: number, total: number, rng = aleatorio) =>
  Math.min(total, atual + 6 + inteiro(5, rng))
