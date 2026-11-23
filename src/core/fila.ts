import type { Estado } from './db'
import type { Baralho, Cartao } from './types'
import { chave, vencido } from './srs'
import { aleatorio, embaralhar } from './aleatorio'

export type Filtro = 'tudo' | 'teoria' | 'calculo'

export interface OpcoesFila {
  temas?: string[] // vazio = todos
  filtro?: Filtro
  tamanho?: number
  /** Só os cartões nunca vistos (sem estado neste aparelho). */
  soNovos?: boolean
}


function candidatos(b: Baralho, o: OpcoesFila, estados?: Map<string, Estado>): Cartao[] {
  return b.cartoes.filter(
    (c) =>
      (!o.temas?.length || o.temas.includes(c.tema)) &&
      (!o.soNovos || !estados?.has(chave(b.id, c.id))) &&
      (o.filtro === 'calculo' ? c.tipo === 'calculo' : o.filtro === 'teoria' ? c.tipo !== 'calculo' : true),
  )
}

/** A cada quantos cartões entra um nunca visto, enquanto houver. */
export const NOVO_A_CADA = 3

/**
 * Fila do "Estudar": a revisão segue a ordem 1. errados por último; 2. vencidos hoje
 * (repetição espaçada); 3. difíceis; 4. acertados, os acertados há mais tempo primeiro.
 * Os nunca vistos entram intercalados (um a cada NOVO_A_CADA), para toda sessão
 * avançar pelo baralho inteiro mesmo com muitos errados ou vencidos.
 */
export function filaProva(b: Baralho, estados: Map<string, Estado>, o: OpcoesFila = {}, rng = aleatorio, agora = Date.now()): Cartao[] {
  const grupo = (c: Cartao) => {
    const e = estados.get(chave(b.id, c.id))
    if (!e) return 2
    if (e.ultimaNota === 1) return 0
    if (vencido(e, agora)) return 1
    return e.ultimaNota === 2 ? 3 : 4
  }
  const grupos: Cartao[][] = [[], [], [], [], []]
  for (const c of candidatos(b, o, estados)) grupos[grupo(c)].push(c)
  const antigo = (c: Cartao) => estados.get(chave(b.id, c.id))?.ultimaData ?? 0
  const ordenados = grupos.map((g, i) => (i === 4 ? embaralhar(g, rng).sort((x, y) => antigo(x) - antigo(y)) : embaralhar(g, rng)))
  const novos = misturarTemas(ordenados[2])
  const revisao = misturarTemas(ordenados.filter((_, i) => i !== 2).flat())
  return intercalar(revisao, novos, NOVO_A_CADA).slice(0, o.tamanho ?? 20)
}

/** Põe um de `novos` a cada `n` cartões (posições n, 2n…); sobrando, seguem os de uma lista só. */
export function intercalar<T>(revisao: T[], novos: T[], n: number): T[] {
  const out: T[] = []
  let r = 0
  let k = 0
  while (r < revisao.length || k < novos.length) {
    const vezDoNovo = (out.length + 1) % n === 0
    if (k < novos.length && (vezDoNovo || r >= revisao.length)) out.push(novos[k++])
    else out.push(revisao[r++])
  }
  return out
}

/** Revisão espaçada: cartões vencidos (FSRS) e até `novos` cartões novos. */
export function filaEspacada(b: Baralho, estados: Map<string, Estado>, o: OpcoesFila = {}, novos = 15): Cartao[] {
  const agora = Date.now()
  const cs = candidatos(b, o, estados)
  const vencidos = cs
    .filter((c) => estados.has(chave(b.id, c.id)) && vencido(estados.get(chave(b.id, c.id)), agora))
    .sort((x, y) => +new Date(estados.get(chave(b.id, x.id))!.fsrs.due) - +new Date(estados.get(chave(b.id, y.id))!.fsrs.due))
  const nunca = embaralhar(cs.filter((c) => !estados.has(chave(b.id, c.id)))).slice(0, novos)
  return [...vencidos, ...nunca].slice(0, o.tamanho ?? 50)
}

/** Evita três cartões seguidos do mesmo tema quando houver alternativa. */
function misturarTemas(cs: Cartao[]): Cartao[] {
  const out: Cartao[] = []
  const resto = [...cs]
  while (resto.length) {
    const n = out.length
    let i = 0
    if (n >= 2 && out[n - 1].tema === out[n - 2].tema) {
      const j = resto.findIndex((c) => c.tema !== out[n - 1].tema)
      if (j > 0 && j < 6) i = j
    }
    out.push(resto.splice(i, 1)[0])
  }
  return out
}

/** Próxima posição de um cartão errado na sessão: volta depois de 3 a 5 cartões. */
export const posicaoReinsercao = (atual: number, total: number, rng = aleatorio) =>
  Math.min(total, atual + 3 + Math.floor(rng() * 3))
