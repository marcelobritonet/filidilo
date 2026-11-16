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
