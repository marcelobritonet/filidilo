// Proporção dos tipos de cartão (P141): números exatos em vez de "cerca de", para a IA não cair na pergunta aberta.
// Decisão do Marcelo (28/11): foco em acerto claro.
import type { Cartao } from '../types'

export type TipoCartao = Cartao['tipo']

/** Ordem em que os tipos aparecem no pedido (e desempate do arredondamento). */
const ORDEM: TipoCartao[] = ['associacao', 'vf', 'lacunas', 'colunas', 'conceito', 'calculo']

/** Porcentagens. "comContas" só vale para a mistura "Tudo"; "Só cálculo" é 100% cálculo. */
export const PROPORCOES: Record<'semContas' | 'comContas', Partial<Record<TipoCartao, number>>> = {
  semContas: { associacao: 35, vf: 25, lacunas: 15, colunas: 10, conceito: 15 },
  comContas: { associacao: 25, vf: 20, lacunas: 15, colunas: 10, conceito: 15, calculo: 15 },
}

/** Quantos cartões de cada tipo, somando exatamente `quantidade` (maior resto). Tipos com zero ficam de fora. */
export function distribuirTipos(quantidade: number, comContas: boolean): [TipoCartao, number][] {
  const pct = PROPORCOES[comContas ? 'comContas' : 'semContas']
  const tipos = ORDEM.filter((t) => pct[t])
  const brutos = tipos.map((t) => (quantidade * pct[t]!) / 100)
  const n = brutos.map(Math.floor)
  let falta = quantidade - n.reduce((a, b) => a + b, 0)
  const porResto = tipos.map((_, i) => i).sort((a, b) => brutos[b] - n[b] - (brutos[a] - n[a]) || a - b)
  for (const i of porResto) {
    if (falta <= 0) break
    n[i]++
    falta--
  }
  return tipos.map((t, i) => [t, n[i]] as [TipoCartao, number]).filter(([, q]) => q > 0)
}

const lista = (itens: string[]) => (itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}` : itens[0])

/** O que fazer quando o material não tem pares ou contas: troca por alternativas. */
function trocas(tipos: TipoCartao[]): string {
  const t: string[] = []
  if (tipos.includes('colunas')) t.push('Se o material não tiver coisas que formam pares (termos e definições, autores e obras), troque os "colunas" por "associacao".')
  if (tipos.includes('calculo')) t.push('Se o material não tiver fórmulas e contas, troque os "calculo" por "associacao".')
  return t.join(' ')
}

/** Pedido com a quantidade conhecida: números exatos por tipo. */
export function textoProporcaoExata(quantidade: number, comContas: boolean): string {
  const d = distribuirTipos(quantidade, comContas)
  return `Por tipo, exatamente: ${lista(d.map(([t, q]) => `${q} "${t}"`))}. ${trocas(d.map(([t]) => t))} Antes de responder, conte os cartões de cada tipo. A pergunta aberta ("conceito") é a exceção: com alternativas, V/F, lacunas e colunas a pessoa sabe se acertou.`.replace(/\s+/g, ' ').trim()
}

/** Pedido sem a quantidade (arquivo, "mais cartões"): porcentagens e um teto para a pergunta aberta. */
export function textoProporcaoPorcentagem(comContas: boolean): string {
  const pct = PROPORCOES[comContas ? 'comContas' : 'semContas']
  const tipos = ORDEM.filter((t) => pct[t])
  return `Distribua os tipos assim: ${lista(tipos.map((t) => `${pct[t]}% "${t}"`))}, e a pergunta aberta ("conceito") nunca passa de ${pct.conceito}%. ${trocas(tipos)} Antes de responder, conte os cartões de cada tipo.`.replace(/\s+/g, ' ').trim()
}

/** Contagem por tipo de uma leitura, para a telemetria (ver se as IAs cumprem). */
export function contarTipos(cartoes: Cartao[]): Record<string, number> {
  const r: Record<string, number> = {}
  for (const c of cartoes) r[`tipo_${c.tipo}`] = (r[`tipo_${c.tipo}`] ?? 0) + 1
  return r
}
