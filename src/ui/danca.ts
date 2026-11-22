// Linha do tempo da tela de abertura do Filidilo: a cauda que abre.
// As penas balançam e sobem, abrem em leque, vibram e se juntam no centro formando o símbolo.
// Funções puras (sem DOM), para testar; o desenho fica em Abertura.tsx.

/** Fim de cada fase, em ms. */
export const FASES = {
  balanco: 1200, // o feixe fechado oscila e sobe
  abertura: 2000, // o leque abre
  tremor: 2500, // as penas vibram abertas
  fechamento: 3200, // as penas voltam ao centro e viram o símbolo
  nome: 3600, // o nome aparece
} as const

export const DURACAO = FASES.nome
export const PENAS = 9
const CENTRO = (PENAS - 1) / 2
/** Ângulo entre duas penas vizinhas com o leque todo aberto (as de fora ficam a ±68°). */
const PASSO = 17

export interface Pena {
  /** Rotação em graus em volta do pivô, abaixo da base da pena. */
  angulo: number
  escala: number
}

export interface Quadro {
  /** Rotação do feixe inteiro (o balanço), em graus. */
  anguloFeixe: number
  /** Deslocamento vertical do feixe, em unidades da grade 100×100 do símbolo. */
  subida: number
  escalaFeixe: number
  /** Penas na ordem da esquerda para a direita; a do meio é a do símbolo. */
  penas: Pena[]
  opacidadeNome: number
}

const limitar = (x: number) => Math.max(0, Math.min(1, x))
const saidaCubica = (p: number) => 1 - Math.pow(1 - p, 3)
const saidaComVolta = (p: number) => 1 + 2.6 * Math.pow(p - 1, 3) + 1.6 * Math.pow(p - 1, 2)
const entradaSaida = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

/** O quadro da animação no instante `t` (ms desde o início). */
export function quadro(t: number): Quadro {
  t = Math.max(0, t)
  let anguloFeixe = 0
  let subida = 0
  let escalaFeixe = 1
  let abertura = 0 // 0 = penas juntas, 1 = leque aberto
  let tremor = 0
  const fechado = 0.05 // no balanço o feixe abre um fio, para se ver que são várias penas

  if (t < FASES.balanco) {
    const p = t / FASES.balanco
    const e = saidaCubica(p)
    anguloFeixe = 38 * Math.pow(1 - p, 1.2) * Math.cos(p * 3 * Math.PI)
    subida = 87 * (1 - e)
    escalaFeixe = 0.6 + 0.4 * e
    abertura = fechado
  } else if (t < FASES.abertura) {
    const p = (t - FASES.balanco) / (FASES.abertura - FASES.balanco)
    abertura = fechado + (1 - fechado) * saidaComVolta(p)
  } else if (t < FASES.tremor) {
    const q = (t - FASES.abertura) / (FASES.tremor - FASES.abertura)
    abertura = 1 + 0.05 * Math.sin(q * 6 * Math.PI) * (1 - q)
    tremor = 1.4 * (1 - q)
  } else if (t < FASES.fechamento) {
    abertura = 1 - entradaSaida((t - FASES.tremor) / (FASES.fechamento - FASES.tremor))
  }

  const penas: Pena[] = []
  for (let i = 0; i < PENAS; i++) {
    const d = i - CENTRO
    penas.push({
      angulo: d * PASSO * abertura + tremor * Math.sin(t / 28 + i * 1.7),
      // As de fora um pouco menores, para dar profundidade; juntas, todas voltam ao tamanho do símbolo.
      escala: 1 - (0.12 * Math.abs(d)) / CENTRO * limitar(abertura * 3),
    })
  }

  const opacidadeNome = saidaCubica(limitar((t - FASES.fechamento) / (FASES.nome - FASES.fechamento)))
  return { anguloFeixe, subida, escalaFeixe, penas, opacidadeNome }
}

/** Data local no formato AAAA-MM-DD. */
export function diaLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

/** A dança completa só toca na primeira abertura do dia; nas outras, o símbolo aparece pronto. */
export function tocarDanca(ultimoDia: string | null, hoje: string, reduzirMovimento: boolean): boolean {
  return !reduzirMovimento && ultimoDia !== hoje
}
