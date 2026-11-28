// Renovar com IA os cartões que já existem (P139): a IA acrescenta as variações (outros enunciados,
// formas da certa, erradas, afirmações do V/F) mantendo o id, e o progresso continua. Por tema, em blocos.
import { novoIdCartao, problemasDoCartao } from '../cartoes'
import { infoNivel, type Baralho, type Cartao, type CartaoAssociacao } from '../types'
import { REGRA_ASSOCIACAO, REGRA_CONCEITO_VF, regraEntrega, regraNaoEntregar, regraVariacoes } from './instrucao'
import { consertarMultipla } from './multipla'
import { extrairJson, normalizarCampos } from './resposta'

/** Cartões por pedido: com as variações, cada cartão fica uns 4 vezes maior. */
export const TAMANHO_BLOCO = 15

const TIPOS = new Set(['conceito', 'vf', 'associacao'])

/** Já tem as variações (veio da instrução nova ou foi renovado)? */
export function temVariacoes(c: Cartao): boolean {
  if (c.tipo === 'vf') return !!c.variantes?.length
  if (c.tipo === 'conceito' || c.tipo === 'associacao') return !!c.outrasFrentes?.length
  return false
}

/** Entra na renovação: pergunta aberta, V/F ou alternativas, não arquivado, sem variações e ainda não renovado. */
export const precisaRenovar = (c: Cartao): boolean => TIPOS.has(c.tipo) && !c.arquivadoEm && !c.renovadoEm && !temVariacoes(c)

export const cartoesParaRenovar = (b: Pick<Baralho, 'cartoes'>, temaId: string): Cartao[] =>
  b.cartoes.filter((c) => c.tema === temaId && precisaRenovar(c))

/** Por tema: quantos faltam renovar e quantos cartões renováveis o tema tem. */
export function resumoPorTema(b: Pick<Baralho, 'temas' | 'cartoes'>): { id: string; nome: string; faltam: number; total: number }[] {
  return b.temas.map((t) => {
    const doTema = b.cartoes.filter((c) => c.tema === t.id && TIPOS.has(c.tipo) && !c.arquivadoEm)
    return { id: t.id, nome: t.nome, faltam: doTema.filter(precisaRenovar).length, total: doTema.length }
  })
}

/** Alternativas que vieram de uma prova (ou digitadas à mão): poucas opções e nenhuma outra forma. Não ganham erradas novas. */
export const opcoesFixas = (c: Cartao): c is CartaoAssociacao =>
  c.tipo === 'associacao' && c.opcoes.length <= 5 && !c.outrasFormas?.length

/** O cartão como vai no pedido: sem campos internos do app; marca as alternativas que devem ficar como estão. */
function paraIA(c: Cartao): Record<string, unknown> {
  const { origem: _o, editado: _e, atualizadoEm: _a, arquivadoEm: _ar, favoritoEm: _f, renovadoEm: _r, ...resto } = c
  return opcoesFixas(c) ? { ...resto, manterOpcoes: true } : resto
}

const REGRAS = `- Mantenha o "id", o "tema", a "fonte" e o fato perguntado. A resposta certa continua a mesma; só a corrija se estiver errada, e diga em "explicacao" o que mudou.
- Acrescente as variações do tipo (veja "Campos de variação" e "Variações").
- Tipo "conceito" (pergunta aberta): não crie "outrasFrentes" nele, porque outro enunciado acaba pedindo outra coisa (o nome, quando a resposta é a descrição). Prefira trocar para "associacao", com as variações: se a resposta é curta (um nome, um número, um termo), as erradas são outros do mesmo tipo; se é uma descrição ("Quem é Coby?"), a certa é a descrição resumida em até 12 palavras e as erradas são descrições de outros do mesmo assunto, e os outros enunciados citam o mesmo termo da pergunta ("Qual destas frases descreve Coby?"). Se não der para trocar, devolva o cartão como está. Não troque os outros tipos.
- Se a resposta tem várias partes (uma lista, "e também"), o cartão fica com a parte principal e cada outra parte vira um cartão novo, com "id" "novo-1", "novo-2"…, no mesmo "tema".
- Cartão com "manterOpcoes": true: as alternativas vieram de uma prova. Mantenha as "opcoes" e a "correta" como estão, não crie erradas nem "outrasFormas", e acrescente só "outrasFrentes". Não devolva o campo "manterOpcoes".
- Use o próprio cartão e conhecimento consolidado, sem sair do assunto do baralho.`

/**
 * Pedido de um bloco. O primeiro bloco da conversa leva o contexto do baralho; os seguintes, só "próximo bloco".
 * As regras dos campos vão sempre, porque a conversa pode ter ficado longa ou ter sido trocada.
 */
export function montarRenovacao(b: Pick<Baralho, 'titulo' | 'temas' | 'objetivo'>, temaId: string, bloco: Cartao[], p: { primeiro: boolean; numero: number; total: number }): string {
  const tema = b.temas.find((t) => t.id === temaId)?.nome ?? temaId
  const nivel = infoNivel(b.objetivo?.nivel)
  const contexto = [
    b.objetivo?.resumo && `Objetivo do baralho: ${b.objetivo.resumo}.`,
    nivel && `Nível: ${nivel.nome.toLowerCase()}. ${nivel.instrucao}`,
    b.objetivo?.evitar?.length && `Não crie nada sobre: ${b.objetivo.evitar.join('; ')}.`,
  ].filter(Boolean)
  const abertura = p.primeiro
    ? `Você vai renovar flashcards que já existem no app Filidilo: a pessoa já estuda estes cartões, e eles vão ganhar variações para não voltarem sempre iguais. Responda SOMENTE com um bloco de código JSON, sem texto antes ou depois (veja "Entrega").

## Baralho
"${b.titulo}", tema "${tema}".${contexto.length ? `\n${contexto.join('\n')}` : ''}`
    : `Próximo bloco de cartões para renovar, com as mesmas regras de antes. Responda SOMENTE com um bloco de código JSON.`
  return `${abertura}

## O que fazer com cada cartão
${REGRAS}

## Campos de variação
${REGRA_CONCEITO_VF}
${REGRA_ASSOCIACAO}

${regraVariacoes()}

${regraNaoEntregar()}

## Cartões (bloco ${p.numero} de ${p.total}, ${bloco.length} ${bloco.length === 1 ? 'cartão' : 'cartões'})
\`\`\`json
${JSON.stringify(bloco.map(paraIA), null, 1)}
\`\`\`

## Entrega
Um objeto JSON {"cartoes": [...]} com todos os cartões deste bloco, renovados, e os cartões novos ("novo-1"…), se houver.
${regraEntrega()}
`
}

export interface Renovado {
  /** Como o cartão estava. */
  antes: Cartao
  cartao: Cartao
  erros: string[]
}

export interface NovoLido {
  cartao: Cartao
  /** Id que a IA deu ("novo-1"), para o pedido de correção. */
  idIA: string
  erros: string[]
}

export interface RenovacaoLida {
  renovados: Renovado[]
  novos: NovoLido[]
  /** Cartões do bloco que não voltaram. */
  faltando: string[]
}

/** Lê a resposta (ou uma correção): casa cada cartão pelo id com o bloco enviado. */
export function lerRenovacao(texto: string, b: Baralho, bloco: Cartao[]): RenovacaoLida {
  const d = extrairJson(texto) as { cartoes?: unknown; cards?: unknown } | unknown[]
  const lista = (Array.isArray(d) ? d : (d.cartoes ?? d.cards)) as unknown
  if (!Array.isArray(lista) || !lista.length) throw new Error('A resposta não tem uma lista "cartoes".')
  const porId = new Map(bloco.map((c) => [c.id, c]))
  const temaPadrao = bloco[0]?.tema
  const renovados: Renovado[] = []
  const novos: NovoLido[] = []
  for (const item of lista as Record<string, unknown>[]) {
    if (!item || typeof item !== 'object') continue
    const idIA = String(item.id ?? '')
    const antes = porId.get(idIA)
    const { manterOpcoes: _m, ...bruto } = item
    if (antes) {
      if (renovados.some((r) => r.antes.id === idIA)) continue
      let c = { ...bruto, id: antes.id, tema: antes.tema, origem: antes.origem, fonte: bruto.fonte ?? antes.fonte } as Cartao
      normalizarCampos(c)
      // Pergunta aberta não ganha outros enunciados na renovação: no teste, a IA passava a pedir o nome em vez da descrição.
      if (c.tipo === 'conceito' && 'outrasFrentes' in c) delete (c as { outrasFrentes?: string[] }).outrasFrentes
      const erros: string[] = []
      const trocaValida = c.tipo === antes.tipo || (antes.tipo === 'conceito' && c.tipo === 'associacao')
      if (!trocaValida) erros.push(`o tipo mudou de "${antes.tipo}" para "${String(c.tipo)}": mantenha o tipo`)
      // Alternativas de prova voltam como estavam, mesmo que a IA tenha mexido.
      if (opcoesFixas(antes) && c.tipo === 'associacao') {
        const { outrasFormas: _f, ...semFormas } = c
        c = { ...semFormas, opcoes: antes.opcoes, correta: antes.correta } as Cartao
      }
      const multipla = consertarMultipla(c)
      c = multipla.cartao
      renovados.push({ antes, cartao: c, erros: [...(multipla.erro ? [multipla.erro] : []), ...erros, ...problemasDoCartao(b, c)] })
    } else if (/^novo/i.test(idIA)) {
      const temaValido = typeof bruto.tema === 'string' && b.temas.some((t) => t.id === bruto.tema)
      let c = { ...bruto, id: novoIdCartao('ia'), tema: temaValido ? bruto.tema : temaPadrao, origem: 'ia', fonte: bruto.fonte ?? { apostila: 'Gerado por IA' } } as Cartao
      normalizarCampos(c)
      const multipla = consertarMultipla(c)
      c = multipla.cartao
      novos.push({ cartao: c, idIA, erros: [...(multipla.erro ? [multipla.erro] : []), ...problemasDoCartao(b, c)] })
    }
  }
  if (!renovados.length && !novos.length) throw new Error('Nenhum cartão da resposta é deste bloco. Confira se colou a resposta certa.')
  const voltaram = new Set(renovados.map((r) => r.antes.id))
  return { renovados, novos, faltando: bloco.filter((c) => !voltaram.has(c.id)).map((c) => c.id) }
}

/** Junta uma correção à leitura anterior: o cartão corrigido substitui o que tinha erro. */
export function juntarRenovacao(ant: RenovacaoLida, nova: RenovacaoLida): RenovacaoLida {
  const ids = new Set(nova.renovados.map((r) => r.antes.id))
  const renovados = [...ant.renovados.filter((r) => !ids.has(r.antes.id)), ...nova.renovados]
  const idsNovos = new Set(nova.novos.map((n) => n.idIA))
  const novos = [...ant.novos.filter((n) => !idsNovos.has(n.idIA) && !n.erros.length), ...nova.novos]
  const voltaram = new Set(renovados.map((r) => r.antes.id))
  return { renovados, novos, faltando: ant.faltando.filter((id) => !voltaram.has(id)) }
}
