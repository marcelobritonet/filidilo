import { arquivoDoBaralho, arquivoDosCartoes } from '../core/compartilhar'
import type { Baralho, Cartao } from '../core/types'

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

/** Envia o baralho inteiro. */
export function enviarBaralho(b: Baralho) {
  const { nome, texto } = arquivoDoBaralho(b)
  return enviarArquivo(nome, texto, `Baralho “${b.titulo}”. ${MENSAGEM_ENVIO}`)
}

/** Envia um cartão (com o tema dele). */
export function enviarCartao(b: Baralho, c: Cartao) {
  const { nome, texto } = arquivoDosCartoes(b, [c])
  return enviarArquivo(nome, texto, `Cartão do tatino. ${MENSAGEM_ENVIO}`)
}
