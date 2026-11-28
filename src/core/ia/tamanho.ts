// Respostas curtas (P142): a pessoa precisa saber se acertou. Resposta longa ou com várias partes
// (uma lista dentro da resposta) volta para a IA dividir em cartões de uma resposta só.
import type { Cartao } from '../types'

/** Resposta de pergunta aberta: acima disso, é explicação, não resposta. */
export const MAX_VERSO = 160
/** Cada alternativa: acima disso, a opção vira um parágrafo. */
export const MAX_OPCAO = 120

export const ERRO_LONGA = 'resposta longa ou com várias partes: deixe uma resposta só, de até 15 palavras, e divida o resto em outros cartões'
export const ERRO_OPCAO_LONGA = 'alternativa longa demais: cada opção com até 12 palavras'

const semFormatacao = (s: string) => s.replace(/\$[^$]*\$/g, 'x').replace(/[*_]/g, '').trim()

/** Lista dentro da resposta: 3 ou mais linhas, itens numerados ("1)", "a.", "2-") ou 3 ou mais partes separadas por ";". */
export function temVariasPartes(texto: string): boolean {
  const t = texto.trim()
  if (t.split(/\n+/).filter((l) => l.trim()).length >= 3) return true
  if ((t.match(/(^|\s)(\d{1,2}|[a-h])[).\-–]\s/gi) ?? []).length >= 3) return true
  if (t.split(';').filter((p) => p.trim()).length >= 3) return true
  return false
}

/** Problemas de tamanho de um cartão criado pela IA (vazio = ok). Não vale para as perguntas da própria pessoa. */
export function problemasDeTamanho(c: Cartao): string[] {
  if (c.tipo === 'conceito' && typeof c.verso === 'string') {
    const v = semFormatacao(c.verso)
    if (v.length > MAX_VERSO || temVariasPartes(c.verso)) return [ERRO_LONGA]
  }
  if (c.tipo === 'associacao' && Array.isArray(c.opcoes)) {
    const formas = [...c.opcoes, ...(c.outrasFormas ?? [])]
    if (formas.some((o) => typeof o === 'string' && semFormatacao(o).length > MAX_OPCAO)) return [ERRO_OPCAO_LONGA]
  }
  return []
}

/** Resposta longa num cartão que já existe: entra na renovação para ser dividida. */
export const respostaLonga = (c: Cartao): boolean => problemasDeTamanho(c).length > 0
