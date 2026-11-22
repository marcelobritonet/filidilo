import { arquivoDoBaralho, arquivoDosCartoes } from '../core/compartilhar'
import { progressoDoBaralho, type Progresso } from '../core/progresso'
import type { Baralho, Cartao } from '../core/types'

/** O que vai ser enviado, por link ou arquivo (o texto é o mesmo JSON nos dois). */
export interface ConteudoEnvio {
  o_que: 'baralho' | 'cartao'
  titulo: string
  nome: string
  texto: string
  mensagem: string
}

/** Envia um arquivo pelo "Compartilhar" do celular (WhatsApp etc.); no computador, baixa o arquivo. */
export async function enviarArquivo(nome: string, texto: string, mensagem: string): Promise<'enviado' | 'baixado' | 'cancelado'> {
  const arquivo = new File([texto], nome, { type: 'text/plain' })
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: mensagem })
      return 'enviado'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado'
    }
  }
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
  return 'baixado'
}

export const MENSAGEM_ENVIO = 'Para abrir no Filidilo: segure o arquivo → Compartilhar → Filidilo.'

/** O baralho inteiro. */
export function conteudoBaralho(b: Baralho, progresso?: Progresso): ConteudoEnvio {
  const { nome, texto } = arquivoDoBaralho(b, progresso)
  const titulo = `Baralho “${b.titulo}”${progresso ? ' com o progresso' : ''}`
  return { o_que: 'baralho', titulo, nome, texto, mensagem: `${titulo}. ${MENSAGEM_ENVIO}` }
}

/** Um cartão (com o tema dele). */
export function conteudoCartao(b: Baralho, c: Cartao): ConteudoEnvio {
  const { nome, texto } = arquivoDosCartoes(b, [c])
  return { o_que: 'cartao', titulo: 'Cartão do Filidilo', nome, texto, mensagem: `Cartão do Filidilo. ${MENSAGEM_ENVIO}` }
}

/** O baralho com o progresso dela, para a caixa "Incluir meu progresso" (null se não estudou nada). */
export async function conteudoBaralhoComProgresso(b: Baralho): Promise<{ conteudo: ConteudoEnvio; estudados: number } | null> {
  const p = await progressoDoBaralho(b.id)
  if (!p.estados.length) return null
  return { conteudo: conteudoBaralho(b, p), estudados: p.estados.length }
}
