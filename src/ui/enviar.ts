import { arquivoDoBaralho, arquivoDosCartoes } from '../core/compartilhar'
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

export const MENSAGEM_ENVIO = 'Para abrir no tatino.: segure o arquivo → Compartilhar → tatino.'

/** O baralho inteiro. */
export function conteudoBaralho(b: Baralho): ConteudoEnvio {
  const { nome, texto } = arquivoDoBaralho(b)
  return { o_que: 'baralho', titulo: `Baralho “${b.titulo}”`, nome, texto, mensagem: `Baralho “${b.titulo}”. ${MENSAGEM_ENVIO}` }
}

/** Um cartão (com o tema dele). */
export function conteudoCartao(b: Baralho, c: Cartao): ConteudoEnvio {
  const { nome, texto } = arquivoDosCartoes(b, [c])
  return { o_que: 'cartao', titulo: 'Cartão do tatino.', nome, texto, mensagem: `Cartão do tatino. ${MENSAGEM_ENVIO}` }
}
