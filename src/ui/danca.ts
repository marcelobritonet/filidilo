// Linha do tempo da tela de abertura do Filidilo: a cauda que abre.
// As penas balançam e sobem, abrem em leque, vibram e se juntam no centro formando o símbolo.
// A comemoração do fim da sessão usa as mesmas penas e termina com o leque aberto.
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

/** Fases da comemoração no fim da sessão: o mesmo balanço e a mesma abertura, um tremor mais
 *  longo e o leque fica aberto (o pavão se exibindo). */
export const FASES_COMEMORACAO = {
  balanco: 1200,
  abertura: 2000,
  tremor: 3200,
} as const

export const DURACAO_COMEMORACAO = FASES_COMEMORACAO.tremor

interface Roteiro {
  balanco: number
  abertura: number
  tremor: number
  /** Fim do fechamento; sem ele, o leque fica aberto. */
  fechamento?: number
  /** Quantas meias-ondas a abertura faz no tremor. */
  ondas: number
  /** Graus que cada pena vibra no começo do tremor. */
  vibracao: number
}

const ROTEIRO_ABERTURA: Roteiro = { ...FASES, ondas: 6, vibracao: 1.4 }
const ROTEIRO_COMEMORACAO: Roteiro = { ...FASES_COMEMORACAO, ondas: 14, vibracao: 2.4 }

function montar(t: number, r: Roteiro): Omit<Quadro, 'opacidadeNome'> {
  t = Math.max(0, t)
  let anguloFeixe = 0
  let subida = 0
  let escalaFeixe = 1
  let abertura = r.fechamento === undefined ? 1 : 0 // 0 = penas juntas, 1 = leque aberto
  let tremor = 0
  const fechado = 0.05 // no balanço o feixe abre um fio, para se ver que são várias penas

  if (t < r.balanco) {
    const p = t / r.balanco
    const e = saidaCubica(p)
    anguloFeixe = 38 * Math.pow(1 - p, 1.2) * Math.cos(p * 3 * Math.PI)
    subida = 87 * (1 - e)
    escalaFeixe = 0.6 + 0.4 * e
    abertura = fechado
  } else if (t < r.abertura) {
    const p = (t - r.balanco) / (r.abertura - r.balanco)
    abertura = fechado + (1 - fechado) * saidaComVolta(p)
  } else if (t < r.tremor) {
    const q = (t - r.abertura) / (r.tremor - r.abertura)
    abertura = 1 + 0.05 * Math.sin(q * r.ondas * Math.PI) * (1 - q)
    tremor = r.vibracao * (1 - q)
  } else if (r.fechamento !== undefined && t < r.fechamento) {
    abertura = 1 - entradaSaida((t - r.tremor) / (r.fechamento - r.tremor))
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
  return { anguloFeixe, subida, escalaFeixe, penas }
}

/** O quadro da abertura no instante `t` (ms desde o início). */
export function quadro(t: number): Quadro {
  const opacidadeNome = saidaCubica(limitar((t - FASES.fechamento) / (FASES.nome - FASES.fechamento)))
  return { ...montar(t, ROTEIRO_ABERTURA), opacidadeNome }
}

/** O quadro da comemoração no instante `t`: termina com o leque aberto, sem o nome. */
export function quadroComemoracao(t: number): Quadro {
  return { ...montar(t, ROTEIRO_COMEMORACAO), opacidadeNome: 0 }
}

/** A dança toca em toda abertura, menos com "reduzir movimento" (aí o símbolo aparece pronto). */
export function tocarDanca(reduzirMovimento: boolean): boolean {
  return !reduzirMovimento
}
