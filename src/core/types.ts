// Formato do baralho (JSON). Texto aceita fórmulas entre $...$ (KaTeX).

export interface Fonte {
  apostila: string
  pagina?: number | string
}

export interface Tema {
  id: string
  nome: string
  prioritario?: boolean
  /** Uma frase sobre o que o tema cobre (vem do plano da IA). */
  descricao?: string
}

/** Quanto a pessoa já sabe sobre o assunto. Ordem do menos para o mais. */
export type Nivel = 'zero' | 'iniciante' | 'nocoes' | 'bastante' | 'expert' | 'extremo'

export interface NivelInfo {
  valor: Nivel
  /** Nome curto, para botões e listas. */
  nome: string
  /** Frase que a pessoa escolhe ao montar o pedido. */
  pedido: string
  /** O que a IA deve fazer com cada nível (vai dentro da instrução). */
  instrucao: string
}

/** Níveis na ordem. Os textos de `instrucao` são o que faz os cartões acertarem o tom. */
export const NIVEIS: NivelInfo[] = [
  {
    valor: 'zero',
    nome: 'Do zero',
    pedido: 'Não sei absolutamente nada. Vou começar do zero.',
    instrucao: 'Começa do zero absoluto: explique cada termo novo no próprio cartão, sem supor nada. Perguntas simples e diretas, com o básico primeiro. Nada de detalhe fino.',
  },
  {
    valor: 'iniciante',
    nome: 'Sei pouco',
    pedido: 'Sei pouco. Sou iniciante.',
    instrucao: 'Pessoa iniciante: use vocabulário básico e defina o termo técnico na primeira vez que ele aparecer. Foque no essencial, sem pegadinhas.',
  },
  {
    valor: 'nocoes',
    nome: 'Boas noções',
    pedido: 'Tenho boas noções.',
    instrucao: 'Pessoa com boas noções: pergunte o porquê e o como, e as distinções que confundem quem está começando. Pode supor os termos básicos e não repita o óbvio.',
  },
  {
    valor: 'bastante',
    nome: 'Já sei bastante',
    pedido: 'Já sei bastante sobre o assunto.',
    instrucao: 'Pessoa que já sabe bastante: faça perguntas de aplicação, comparações, exceções e erros comuns. Não repita o básico.',
  },
  {
    valor: 'expert',
    nome: 'Expert',
    pedido: 'Nível expert. Quero me aperfeiçoar.',
    instrucao: 'Pessoa expert que quer se aperfeiçoar: casos difíceis, detalhes finos, justificativas profundas e pegadinhas de prova. Nada de explicar o básico.',
  },
  {
    valor: 'extremo',
    nome: 'Extremo',
    pedido: 'Nível extremo. Provavelmente vou errar todas.',
    instrucao: 'Nível extremo: perguntas difíceis de verdade, do tipo que um especialista erra. Use casos-limite, sutilezas e consequências pouco óbvias. Difícil, mas sempre correto e verificável: nunca crie uma pegadinha sem resposta certa e clara.',
  },
]

/** Valores de baralhos criados antes da escala nova. */
const NIVEIS_ANTIGOS: Record<string, Nivel> = { intermediario: 'nocoes', avancado: 'bastante' }

/** Converte o nível salvo (inclusive os antigos) no valor atual; desconhecido vira undefined. */
export function normalizarNivel(v: unknown): Nivel | undefined {
  if (typeof v !== 'string') return undefined
  if (NIVEIS.some((n) => n.valor === v)) return v as Nivel
  return NIVEIS_ANTIGOS[v]
}

export const infoNivel = (v: unknown): NivelInfo | undefined => {
  const valor = normalizarNivel(v)
  return NIVEIS.find((n) => n.valor === valor)
}

export interface Objetivo {
  /** O que a pessoa digitou em "O que você quer aprender hoje?". */
  pedido?: string
  /** O objetivo em 1 frase, como a IA (ou a pessoa) definiu. */
  resumo?: string
  nivel?: Nivel
  foco?: string[]
  evitar?: string[]
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
  /** Quando foi arquivado: sai do estudo e das contagens; o texto e o progresso ficam guardados. */
  arquivadoEm?: number
  /** Quando foi marcado como favorito: volta antes dos outros (uma vez por dia) e pode ser estudado à parte. */
  favoritoEm?: number
  /** Quando a IA renovou o cartão (variações acrescentadas, P139): não volta para a lista de renovar. */
  renovadoEm?: number
}

export interface CartaoConceito extends CartaoBase {
  tipo: 'conceito'
  frente: string
  verso: string
  /** Outros enunciados da mesma pergunta; a cada vez o app sorteia um (o progresso é o mesmo). */
  outrasFrentes?: string[]
}

/** Outra afirmação sobre o mesmo fato de um V/F (pode ter a resposta oposta à da principal). */
export interface VarianteVF {
  frente: string
  resposta: boolean
  /** Por que é falsa (obrigatória quando `resposta` é false); sem ela, vale a do cartão. */
  explicacao?: string
}

export interface CartaoVF extends CartaoBase {
  tipo: 'vf'
  frente: string
  resposta: boolean
  /** Outras afirmações sobre o mesmo fato; a cada vez o app sorteia uma (a principal ou uma destas). */
  variantes?: VarianteVF[]
}

export interface CartaoAssociacao extends CartaoBase {
  tipo: 'associacao'
  frente: string
  /** A certa e as erradas. Com mais de 4, cada vez que o cartão aparece o app sorteia 3 erradas. */
  opcoes: string[]
  correta: number // índice em opcoes
  /** Outras formas de dizer a resposta certa; o app alterna entre elas, para a certa não ficar sempre igual. */
  outrasFormas?: string[]
  /** Outros enunciados da mesma pergunta; a cada vez o app sorteia um. */
  outrasFrentes?: string[]
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

/** Frase com lacunas: cada `____` no texto recebe uma resposta, na ordem. "a/b" aceita sinônimos. */
export interface CartaoLacunas extends CartaoBase {
  tipo: 'lacunas'
  frente: string
  respostas: string[]
}

export type Cartao = CartaoConceito | CartaoVF | CartaoAssociacao | CartaoCalculo | CartaoLacunas

export interface Baralho {
  id: string
  titulo: string
  versao: number
  /** Antigo: ignorado; mantido para arquivos e backups antigos continuarem válidos */
  prova?: string
  /** Configuração do baralho (objetivo, nível, foco, evitar). Ausente nos baralhos antigos. */
  objetivo?: Objetivo
  temas: Tema[]
  cartoes: Cartao[]
  criadoEm?: number
  atualizadoEm?: number
  /** Quando foi arquivado: some de Meus baralhos (fica no grupo Arquivados), com cartões e progresso guardados. */
  arquivadoEm?: number
}
