// Corrigir um cartão com ajuda da IA: monta o pedido e lê o cartão corrigido.
import { problemasDoCartao } from '../cartoes'
import { infoNivel, type Baralho, type Cartao, type Objetivo } from '../types'
import { extrairJson, normalizarCampos } from './resposta'
import { regraEntrega } from './instrucao'
import { consertarMultipla, separarAlternativas } from './multipla'

const REGRAS_TIPO: Record<Cartao['tipo'], string> = {
  conceito: '"frente" (pergunta), "verso" (resposta) e "outrasFrentes" (outros enunciados da mesma pergunta, com a mesma resposta).',
  vf: '"frente" (afirmação), "resposta" (true ou false) e "variantes" (outras afirmações sobre o mesmo fato, cada uma { "frente", "resposta", "explicacao" }). Toda afirmação falsa precisa de "explicacao" dizendo o que está errado.',
  associacao: '"frente", "outrasFrentes" (outros enunciados da mesma pergunta), "opcoes" (1 certa e até 12 erradas plausíveis, sem repetir), "correta" (índice da certa, começando em 0) e "outrasFormas" (outras formas de dizer a certa, sem ser mais longas que as erradas).',
  lacunas: '"frente" com ____ em cada lacuna e "respostas" (uma por lacuna, na ordem; use / para sinônimos).',
  calculo:
    '"titulo", "enunciado" com {variavel}, "parametros" { nome: { min, max, passo, unidade } }, "derivados" opcional, e "etapas" com "pergunta", "expr", "unidade", "casas" e "resolucao". Expressões só com números, + - * / ^, parênteses e as funções sqrt, abs, sin, cos, tan, sind, cosd, tand, asin, log10, ln, exp, min, max, round, floor, ceil, se(cond, a, b), pi e e.',
}

/** Campos a manter e regras do tipo. Pergunta com as alternativas no texto passa a ser "associacao" (P90). */
function tipoTexto(c: Cartao): string {
  if (c.tipo !== 'calculo' && separarAlternativas(c.frente)) {
    return `As alternativas estão dentro da pergunta: troque o tipo para "associacao", com só a pergunta em "frente" (sem as alternativas e sem número ou cabeçalho da questão), cada alternativa em "opcoes" (sem a letra, na ordem original) e "correta" com o índice da certa. Mantenha o mesmo "id" e o mesmo "tema".
Campos do tipo "associacao": "frente", "opcoes", "correta" (índice da certa, começando em 0) e "explicacao" dizendo por que ela é a certa.`
  }
  return `Mantenha o mesmo "id", o mesmo "tipo" e o mesmo "tema".
Campos do tipo "${c.tipo}": ${REGRAS_TIPO[c.tipo]}`
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
  return `Este flashcard do app Filidilo pode estar errado. Disciplina: "${b.titulo}". Tema: "${tema}".
${contexto.length ? `\n${contexto.join(' ')}\nMantenha o recorte e o nível: não aumente a dificuldade nem saia do objetivo.\n` : ''}${problema?.trim() ? `\nO que parece errado: ${problema.trim()}\n` : ''}
Cartão atual (JSON):
\`\`\`json
${JSON.stringify(paraIA(c), null, 1)}
\`\`\`

Confira o conteúdo com cuidado, inclusive cada enunciado de "outrasFrentes", cada afirmação de "variantes" e cada errada (nenhuma pode também ser certa). Se houver erro, corrija; se estiver certo, devolva igual. Confira também se a pergunta entrega a resposta (o termo pedido, uma palavra da mesma família ou uma pista óbvia); se entregar, reescreva a pergunta. ${tipoTexto(c)}
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
  normalizarCampos(cartao)
  const multipla = consertarMultipla(cartao)
  const erros = problemasDoCartao(b, multipla.cartao)
  return { cartao: multipla.cartao, erros: multipla.erro ? [multipla.erro, ...erros] : erros }
}
