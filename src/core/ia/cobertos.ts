// Resumo comprimido do que o baralho já cobre, para a IA não repetir os mesmos assuntos (SPEC-V3 5.1).
import type { Baralho, Cartao } from '../types'

/** Limite total, em caracteres (V18). */
export const LIMITE_COBERTOS = 3000
const PALAVRAS_POR_CARTAO = 5

// Palavras vazias e de pergunta em pt-BR, sem acento (a comparação ignora acentos).
const VAZIAS = new Set(
  (
    'a o as os um uma uns umas de da do das dos em no na nos nas e ou por para pra com sem que qual quais quem ' +
    'como quando onde porque quanto quanta quantos quantas é ser são foi se ao aos à às pelo pela pelos pelas ' +
    'num numa isso este esta esse essa entre sobre'
  ).split(' '),
)

const chave = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Texto de partida do cartão: o título, no cálculo; a frente, nos outros tipos. */
const textoDoCartao = (c: Cartao) => (c.tipo === 'calculo' ? c.titulo : c.frente)

/** Até 5 palavras que identificam o assunto do cartão, com a grafia original. */
export function resumoCartao(c: Cartao): string {
  const limpo = (textoDoCartao(c) ?? '')
    .normalize('NFC')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const palavras: string[] = []
  const vistas = new Set<string>()
  for (const p of limpo.split(/\s+/)) {
    if (!p) continue
    const k = chave(p)
    if (VAZIAS.has(k) || vistas.has(k)) continue
    vistas.add(k)
    palavras.push(p)
    if (palavras.length === PALAVRAS_POR_CARTAO) break
  }
  return palavras.join(' ')
}

/**
 * Uma linha por tema, "Nome do tema: a; b; c". Sem repetidos dentro do tema.
 * Passando de 3.000 caracteres, ficam os cartões mais recentes e o texto termina com "(e mais N)".
 * Baralho sem cartões → ''.
 */
export function jaCobertos(baralho: Pick<Baralho, 'temas' | 'cartoes'>): string {
  // Do mais recente para o mais antigo (o último cartão da lista é o mais novo).
  const vistos = new Set<string>()
  const itens: { tema: string; texto: string }[] = []
  for (let i = baralho.cartoes.length - 1; i >= 0; i--) {
    const c = baralho.cartoes[i]
    const texto = resumoCartao(c)
    if (!texto) continue
    const k = `${c.tema}\u0000${chave(texto)}`
    if (vistos.has(k)) continue
    vistos.add(k)
    itens.unshift({ tema: c.tema, texto }) // volta à ordem da lista (mais antigo primeiro)
  }
  if (!itens.length) return ''

  const nomes = new Map(baralho.temas.map((t) => [t.id, t.nome]))
  const montar = (escolhidos: Set<number>, omitidos: number): string => {
    const grupos = new Map<string, string[]>()
    itens.forEach((it, i) => {
      if (!escolhidos.has(i)) return
      grupos.set(it.tema, [...(grupos.get(it.tema) ?? []), it.texto])
    })
    const ordem = [...baralho.temas.map((t) => t.id).filter((id) => grupos.has(id)), ...[...grupos.keys()].filter((id) => !nomes.has(id))]
    const linhas = ordem.map((id) => `${nomes.get(id) ?? 'Geral'}: ${grupos.get(id)!.join('; ')}`)
    const texto = linhas.join('\n')
    return omitidos > 0 ? `${texto} (e mais ${omitidos})` : texto
  }

  const escolhidos = new Set<number>()
  for (let i = itens.length - 1; i >= 0; i--) {
    escolhidos.add(i)
    if (montar(escolhidos, itens.length - escolhidos.size).length > LIMITE_COBERTOS) {
      escolhidos.delete(i)
      break
    }
  }
  return montar(escolhidos, itens.length - escolhidos.size)
}
