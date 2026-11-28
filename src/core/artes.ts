// O que vai em cada imagem de compartilhar (resultado, marco, desafio, semana, convite) e o texto
// que acompanha. Puro: o desenho no canvas fica em src/ui/desenho.ts.
import type { Marco, Semana } from './conquistas'
import type { Cartao } from './types'

export type Formato = 'story' | 'quadrado'
export const TAMANHO: Record<Formato, { w: number; h: number }> = { story: { w: 1080, h: 1920 }, quadrado: { w: 1080, h: 1080 } }

export type Modelo = 'resultado' | 'marco' | 'desafio' | 'semana' | 'convite' | 'progresso'

/** Peças da imagem, de cima para baixo; as ausentes não ocupam espaço. */
export interface Arte {
  modelo: Modelo
  /** Etiqueta pequena no topo ("Meta atingida!"). */
  selo: string
  /** Nome do baralho ou título da peça. */
  titulo?: string
  /** Número grande ("85%"). */
  destaque?: string
  legenda?: string
  /** Parágrafo (a pergunta do desafio). */
  texto?: string
  linhas?: string[]
  dias?: { rotulo: string; estudou: boolean }[]
  /** Barra de andamento larga (0 a 1), como a da meta da semana. */
  fracao?: number
  /** Colunas verticais (ritmo por dia, semana ou mês). */
  barras?: { rotulo: string; valor: number; atual: boolean }[]
  /** Lista com nome, número e barra fina (temas, baralhos). */
  itens?: { nome: string; valor: string; fracao: number }[]
  /** Endereço para o QR code. */
  qr?: string
  /** Frase de chamada embaixo ("Responda no Filidilo."). */
  chamada?: string
  confete?: boolean
  /** Fim de sessão no visual claro da tela (desenho próprio, um dos três layouts). */
  fim?: FimSessao
}

/** Os três layouts da imagem do fim de sessão (pedido de uma usuária, com a tela como referência). */
export type LayoutFim = 'tela' | 'conquista' | 'painel'
export const LAYOUTS_FIM: { layout: LayoutFim; rotulo: string }[] = [
  { layout: 'tela', rotulo: 'Tela' },
  { layout: 'conquista', rotulo: 'Conquista' },
  { layout: 'painel', rotulo: 'Painel' },
]

export interface FimSessao {
  layout: LayoutFim
  /** "Sessão concluída", "Meta atingida!" ou "Mandei bem!". */
  titulo: string
  /** "15 acertos, 4 erros em 19 respostas". */
  placar: string
  pct: number
  certos: number
  total: number
  /** "em 5:32", quando terminou antes do tempo. */
  tempo?: string
  baralho?: string
  /** Dias seguidos da ofensiva (0: não mostra). */
  dias: number
  conquista?: { destaque: string; legenda: string }
}

export interface Peca {
  arte: Arte
  /** Texto que vai junto da imagem (com o link). */
  texto: string
}

const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`
const diasSeguidos = (dias: number) => (dias >= 2 ? `${dias} dias seguidos` : '')

export interface DadosResultado {
  certos: number
  errados: number
  chutes: number
  baralho: string
  comNome: boolean
  bateuMeta?: boolean
  /** "5:32", quando terminou antes do tempo. */
  tempo?: string
  sequencia: number
  urlApp: string
}

export function pecaResultado(d: DadosResultado): Peca {
  const total = d.certos + d.errados + d.chutes
  const pct = total ? Math.round((100 * d.certos) / total) : 0
  const linhas = [`${n(d.certos, 'acerto', 'acertos')} em ${n(total, 'resposta', 'respostas')}`, d.tempo ? `em ${d.tempo}` : '', diasSeguidos(d.sequencia)].filter(Boolean)
  const onde = d.comNome ? ` em “${d.baralho}”` : ''
  return {
    arte: { modelo: 'resultado', selo: d.bateuMeta ? 'Meta atingida!' : pct >= 80 ? 'Mandei bem!' : 'Sessão concluída', titulo: d.comNome ? d.baralho : undefined, destaque: `${pct}%`, legenda: 'de acerto', linhas, confete: d.bateuMeta || pct >= 80, chamada: 'Aprenda qualquer coisa.' },
    texto: [`Fiz ${n(d.certos, 'acerto', 'acertos')} (${pct}%)${onde} no Filidilo.`, diasSeguidos(d.sequencia) && `${diasSeguidos(d.sequencia)}.`, `Aprenda qualquer coisa: ${d.urlApp}`].filter(Boolean).join(' '),
  }
}

export function pecaMarco(m: Marco, d: { comNome: boolean; urlApp: string }): Peca {
  // A frase do baralho dominado tem o nome; sem o nome, vira genérica.
  const frase = m.tipo === 'dominado' && !d.comNome ? `Dominei todos os ${m.destaque} cartões de um baralho` : m.frase
  return {
    // Sequência e respostas: o número e a legenda já dizem tudo; nos outros, a frase completa.
    arte: { modelo: 'marco', selo: 'Conquista!', destaque: m.destaque, legenda: m.legenda, linhas: m.tipo === 'sequencia' || m.tipo === 'respostas' ? [] : [frase], confete: true, chamada: 'Aprenda qualquer coisa.' },
    texto: `${frase} no Filidilo. Aprenda qualquer coisa: ${d.urlApp}`,
  }
}

export interface DadosFim extends DadosResultado {
  marco?: Marco
}

/** A imagem do fim de sessão num dos três layouts; o texto com o link é o mesmo nos três. */
export function pecaFimSessao(d: DadosFim, layout: LayoutFim): Peca {
  const total = d.certos + d.errados + d.chutes
  const pct = total ? Math.round((100 * d.certos) / total) : 0
  const placar = `${n(d.certos, 'acerto', 'acertos')}, ${n(d.errados, 'erro', 'erros')}${d.chutes ? ` e ${n(d.chutes, 'chute', 'chutes')}` : ''} em ${n(total, 'resposta', 'respostas')}`
  const titulo = d.bateuMeta ? 'Meta atingida!' : total >= 10 && pct >= 80 ? 'Mandei bem!' : 'Sessão concluída'
  const m = d.marco
  const frase = m && (m.tipo === 'dominado' && !d.comNome ? `Dominei todos os ${m.destaque} cartões de um baralho` : m.frase)
  const resultado = pecaResultado(d)
  return {
    arte: {
      modelo: m ? 'marco' : 'resultado',
      selo: titulo,
      confete: !!m || !!d.bateuMeta || (total >= 10 && pct >= 80),
      fim: {
        layout,
        titulo,
        placar,
        pct,
        certos: d.certos,
        total,
        tempo: d.tempo ? `em ${d.tempo}` : undefined,
        baralho: d.comNome ? d.baralho : undefined,
        dias: d.sequencia,
        conquista: m ? { destaque: m.destaque, legenda: m.legenda } : undefined,
      },
    },
    texto: frase ? `${frase} no Filidilo. Aprenda qualquer coisa: ${d.urlApp}` : resultado.texto,
  }
}

const SIMBOLOS: Record<string, string> = { pi: 'π', infty: '∞', sqrt: '√', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', omega: 'ω', rho: 'ρ', leq: '≤', geq: '≥', neq: '≠', approx: '≈', to: '→', rightarrow: '→', pm: '±' }

/** Tira marcação de LaTeX e Markdown para caber numa imagem como texto simples. */
export function textoSimples(s: string): string {
  return s
    .replace(/\$\$?([^$]+)\$\$?/g, '$1')
    .replace(/\\(frac|dfrac)\{([^}]*)\}\{([^}]*)\}/g, '($2)/($3)')
    .replace(/\\(cdot|times)/g, '·')
    .replace(/\\(sin|cos|tan|sec|log|ln|exp|lim|max|min)\b/g, '$1')
    .replace(/\\([a-zA-Z]+)/g, (_, nome: string) => SIMBOLOS[nome] ?? '')
    .replace(/[{}]/g, '')
    .replace(/\*\*|`|(?<!_)__(?!_)/g, '') // "____" das lacunas fica
    .replace(/\s+/g, ' ')
    .trim()
}

/** A pergunta do cartão, sem a resposta. */
export function perguntaDoCartao(c: Cartao): { texto: string; dica: string } {
  switch (c.tipo) {
    case 'vf':
      return { texto: textoSimples(c.frente), dica: 'Verdadeiro ou falso?' }
    case 'associacao':
      return { texto: textoSimples(c.frente), dica: 'Escolha a alternativa certa' }
    case 'lacunas':
      return { texto: textoSimples(c.frente), dica: 'Complete as lacunas' }
    case 'conceito':
      return { texto: textoSimples(c.frente), dica: 'Qual é a resposta?' }
    case 'calculo':
      return { texto: textoSimples(c.titulo), dica: 'Resolva' }
  }
}

export function pecaSemana(s: Semana, d: { urlApp: string; sequencia: number }): Peca {
  const pct = s.respostas ? Math.round((100 * s.acertos) / s.respostas) : 0
  const linhas = [`${n(s.respostas, 'cartão respondido', 'cartões respondidos')} · ${pct}% de acerto`, n(s.baralhos.length, 'baralho estudado', 'baralhos estudados'), diasSeguidos(d.sequencia)].filter(Boolean)
  return {
    arte: { modelo: 'semana', selo: 'Minha semana', destaque: `${s.diasEstudados} de 7`, legenda: 'dias estudando', dias: s.dias, linhas, chamada: 'Aprenda qualquer coisa.' },
    texto: `Minha semana no Filidilo: estudei ${n(s.diasEstudados, 'dia', 'dias')} de 7 e respondi ${n(s.respostas, 'cartão', 'cartões')} (${pct}% de acerto). Aprenda qualquer coisa: ${d.urlApp}`,
  }
}

export function pecaConvite(d: { urlApp: string }): Peca {
  return {
    arte: {
      modelo: 'convite',
      selo: 'Indico',
      titulo: 'Aprenda qualquer coisa.',
      linhas: ['Diga o que quer aprender: a IA monta os cartões', 'Estude por tempo ou por meta de acertos', 'Grátis, sem login, funciona sem internet'],
      qr: d.urlApp,
      chamada: 'Filidilo no celular, pelo navegador',
    },
    texto: `Estou usando o Filidilo para estudar: você diz o que quer aprender e a IA monta os cartões. Grátis, sem login: ${d.urlApp}`,
  }
}

/** Embaralhamento estável (para o confete sair igual na prévia e no arquivo). */
export function pseudoAleatorio(semente: number): () => number {
  let s = semente >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** Quebra o texto em linhas que cabem na largura, segundo a função de medida. Corta com "…" no limite. */
export function quebrar(texto: string, largura: number, medir: (s: string) => number, maxLinhas = Infinity): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (medir(tentativa) <= largura || !atual) atual = tentativa
    else {
      linhas.push(atual)
      atual = palavra
    }
  }
  if (atual) linhas.push(atual)
  if (linhas.length <= maxLinhas) return linhas
  const corte = linhas.slice(0, maxLinhas)
  let ultima = corte[maxLinhas - 1]
  while (ultima.length > 1 && medir(`${ultima}…`) > largura) ultima = ultima.slice(0, -1)
  corte[maxLinhas - 1] = `${ultima.trimEnd()}…`
  return corte
}
