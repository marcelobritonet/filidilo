// Formato do baralho (JSON). Texto aceita fórmulas entre $...$ (KaTeX).

export interface Fonte {
  apostila: string
  pagina?: number | string
}

export interface Tema {
  id: string
  nome: string
  prioritario?: boolean
}

interface CartaoBase {
  id: string
  tema: string
  fonte?: Fonte
  explicacao?: string
  /** Como o cartão nasceu. */
  origem?: 'manual' | 'ia' | 'importado'
  /** Editado pela estudante: atualizações importadas não sobrescrevem. */
  editado?: boolean
  atualizadoEm?: number
}

export interface CartaoConceito extends CartaoBase {
  tipo: 'conceito'
  frente: string
  verso: string
}

export interface CartaoVF extends CartaoBase {
  tipo: 'vf'
  frente: string
  resposta: boolean
}

export interface CartaoAssociacao extends CartaoBase {
  tipo: 'associacao'
  frente: string
  /** A certa e as erradas. Com mais de 4, cada vez que o cartão aparece o app sorteia 3 erradas. */
  opcoes: string[]
  correta: number // índice em opcoes
  /** Outras formas de dizer a resposta certa; o app alterna entre elas, para a certa não ficar sempre igual. */
  outrasFormas?: string[]
}

/** Parâmetro sorteado: faixa numérica ou lista de opções com rótulo. */
export type Parametro =
  | { min: number; max: number; passo: number; unidade?: string }
  | { opcoes: { valor: number; rotulo: string }[] }

export interface Etapa {
  pergunta: string
  /** Expressão cujo valor é a resposta da etapa. */
  expr: string
  unidade?: string
  casas?: number
  /** Se presente, a etapa é de escolha: a expr devolve o índice da opção correta. */
  opcoes?: string[]
  /** Resolução mostrada depois de responder. Aceita {variavel} e {variavel:casas}. */
  resolucao: string[]
  /** Nome para usar o resultado em etapas seguintes. */
  nome?: string
}

export interface CartaoCalculo extends CartaoBase {
  tipo: 'calculo'
  titulo: string
  enunciado: string
  parametros: Record<string, Parametro>
  /** Valores intermediários, calculados em ordem, disponíveis para enunciado e etapas. */
  derivados?: Record<string, string>
  /** Sorteia de novo se a condição for falsa (0). Ex.: "calado < prof". */
  condicao?: string
  etapas: Etapa[]
  tolerancia?: number // relativa; padrão 0,02
}

export type Cartao = CartaoConceito | CartaoVF | CartaoAssociacao | CartaoCalculo

export interface Baralho {
  id: string
  titulo: string
  versao: number
  /** Data da prova (AAAA-MM-DD), opcional: mostra a contagem regressiva. */
  prova?: string
  temas: Tema[]
  cartoes: Cartao[]
  criadoEm?: number
  atualizadoEm?: number
}
