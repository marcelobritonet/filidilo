// Avaliação do desempenho recente de um baralho: decide se os próximos cartões devem
// ficar um nível abaixo, no mesmo nível ou um acima. O app sugere; a pessoa pode voltar atrás.
import { db, type Nota } from './db'
import { normalizarNivel, NIVEIS, type Nivel } from './types'

/** Quantas respostas recentes olhar. */
export const JANELA = 40
/** Abaixo disso não há base para sugerir nada. */
export const MINIMO = 15

export type Sugestao = 'subir' | 'manter' | 'descer'

export interface Avaliacao {
  amostra: number
  taxaAcerto: number
  taxaFacil: number
  sugestao: Sugestao
  /** Nível recomendado para os próximos cartões. */
  nivel?: Nivel
}

/** Regra pura: recebe as notas recentes (mais nova primeiro) e o nível atual. */
export function decidir(notas: Nota[], nivelAtual: Nivel | undefined): Avaliacao {
  const amostra = notas.length
  const acertos = notas.filter((n) => n >= 3).length
  const faceis = notas.filter((n) => n === 4).length
  const taxaAcerto = amostra ? acertos / amostra : 0
  const taxaFacil = amostra ? faceis / amostra : 0
  const base = { amostra, taxaAcerto, taxaFacil }

  const i = nivelAtual ? NIVEIS.findIndex((n) => n.valor === nivelAtual) : -1
  if (amostra < MINIMO || i < 0) return { ...base, sugestao: 'manter', nivel: nivelAtual }

  // Errou demais: um degrau abaixo.
  if (taxaAcerto < 0.6) {
    const abaixo = NIVEIS[Math.max(0, i - 1)].valor
    return { ...base, sugestao: abaixo === nivelAtual ? 'manter' : 'descer', nivel: abaixo }
  }
  // Acertou quase tudo e a maioria veio "fácil": um degrau acima.
  if (taxaAcerto >= 0.85 && taxaFacil >= 0.5) {
    const acima = NIVEIS[Math.min(NIVEIS.length - 1, i + 1)].valor
    return { ...base, sugestao: acima === nivelAtual ? 'manter' : 'subir', nivel: acima }
  }
  return { ...base, sugestao: 'manter', nivel: nivelAtual }
}

/** Lê as últimas respostas do baralho e aplica a regra. */
export async function avaliarBaralho(baralhoId: string, nivel: unknown): Promise<Avaliacao> {
  const atual = normalizarNivel(nivel)
  const revisoes = await db.revisoes.where('cartao').startsWith(`${baralhoId}/`).toArray()
  const notas = revisoes
    .sort((a, b) => b.data - a.data)
    .slice(0, JANELA)
    .map((r) => r.nota)
  return decidir(notas, atual)
}
