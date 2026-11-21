// Corrigir um cartão com ajuda da IA: monta o pedido e lê o cartão corrigido.
import { problemasDoCartao } from '../cartoes'
import { infoNivel, type Baralho, type Cartao, type Objetivo } from '../types'
import { extrairJson } from './resposta'
import { regraEntrega } from './instrucao'

const REGRAS_TIPO: Record<Cartao['tipo'], string> = {
  conceito: '"frente" (pergunta) e "verso" (resposta).',
  vf: '"frente" (afirmação) e "resposta" (true ou false). Se for falsa, "explicacao" diz o que está errado.',
  associacao: '"frente", "opcoes" (1 certa e 5 ou 6 erradas plausíveis, sem repetir), "correta" (índice da certa, começando em 0) e "outrasFormas" (1 outra forma de dizer a certa).',
  lacunas: '"frente" com ____ em cada lacuna e "respostas" (uma por lacuna, na ordem; use / para sinônimos).',
  calculo:
    '"titulo", "enunciado" com {variavel}, "parametros" { nome: { min, max, passo, unidade } }, "derivados" opcional, e "etapas" com "pergunta", "expr", "unidade", "casas" e "resolucao". Expressões só com números, + - * / ^, parênteses e as funções sqrt, abs, sin, cos, tan, sind, cosd, tand, asin, log10, ln, exp, min, max, round, floor, ceil, se(cond, a, b), pi e e.',
}

/** Sem campos internos do app, para a IA ver só o conteúdo. */
function paraIA(c: Cartao): Record<string, unknown> {
  const { origem: _o, editado: _e, atualizadoEm: _a, ...resto } = c
  return resto
}

/**
 * Pedido para colar na IA, na mesma conversa ou numa nova.
 * `objetivo` (opcional) mantém a correção dentro do recorte e do nível do baralho.
 */
export function montarPedidoCorrecao(b: Pick<Baralho, 'titulo' | 'temas'>, c: Cartao, problema?: string, objetivo?: Objetivo): string {
  const tema = b.temas.find((t) => t.id === c.tema)?.nome ?? c.tema
  const nivel = infoNivel(objetivo?.nivel)?.nome.toLowerCase()
  const contexto = [
    objetivo?.resumo && `Objetivo do baralho: ${objetivo.resumo}.`,
    nivel && `Nível: ${nivel}.`,
    objetivo?.evitar?.length && `Não crie nada sobre: ${objetivo.evitar.join('; ')}.`,
  ].filter(Boolean)
  return `Este flashcard do app tatino. pode estar errado. Disciplina: "${b.titulo}". Tema: "${tema}".
${contexto.length ? `\n${contexto.join(' ')}\nMantenha o recorte e o nível: não aumente a dificuldade nem saia do objetivo.\n` : ''}${problema?.trim() ? `\nO que parece errado: ${problema.trim()}\n` : ''}
Cartão atual (JSON):
\`\`\`json
${JSON.stringify(paraIA(c), null, 1)}
\`\`\`

Confira o conteúdo com cuidado. Se houver erro, corrija; se estiver certo, devolva igual. Mantenha o mesmo "id", o mesmo "tipo" e o mesmo "tema".
Campos do tipo "${c.tipo}": ${REGRAS_TIPO[c.tipo]}
Use "explicacao" curta para dizer por que a resposta é essa.

Responda SOMENTE com um bloco de código JSON contendo o cartão corrigido, em português do Brasil.
${regraEntrega()}`
}

/**
 * Lê o cartão corrigido. Aceita o cartão sozinho, {"cartao": …} ou {"cartoes": [ … ]}.
 * Mantém id, tema e origem do original; devolve os problemas encontrados (vazio = pode salvar).
 */
export function lerCartaoCorrigido(texto: string, b: Baralho, original: Cartao): { cartao: Cartao; erros: string[] } {
  const d = extrairJson(texto) as Record<string, unknown> | unknown[]
  const bruto = (Array.isArray(d) ? d[0] : Array.isArray(d.cartoes) ? d.cartoes[0] : (d.cartao ?? d)) as Record<string, unknown> | undefined
  if (!bruto || typeof bruto !== 'object' || !('tipo' in bruto)) throw new Error('Não encontrei um cartão na resposta. Copie a resposta inteira da IA.')
  const temaValido = typeof bruto.tema === 'string' && b.temas.some((t) => t.id === bruto.tema)
  const cartao = {
    ...bruto,
    id: original.id,
    tema: temaValido ? bruto.tema : original.tema,
    origem: original.origem,
    fonte: bruto.fonte ?? original.fonte,
  } as Cartao
  if (cartao.tipo === 'vf' && typeof cartao.resposta === 'string') cartao.resposta = (cartao.resposta as string).toLowerCase() === 'true'
  return { cartao, erros: problemasDoCartao(b, cartao) }
}
