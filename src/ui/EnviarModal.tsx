import qrcode from 'qrcode-generator'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { criarLink, linkLigado, type LinkCriado } from '../core/link'
import { evento } from '../core/telemetria'
import { enviarArquivo, type ConteudoEnvio } from './enviar'

/** Gera o SVG do QR code no aparelho (o link é a única entrada). */
function svgDoQr(url: string): string {
  const q = qrcode(0, 'M')
  q.addData(url)
  q.make()
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
}

const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * Enviar baralho ou cartão: gera um link que vale 2 horas (com QR code para ler noutro celular)
 * e, embaixo, a opção de enviar como arquivo, que funciona sem internet.
 */
export function EnviarModal({ conteudo, onde, avisar, fechar }: { conteudo: ConteudoEnvio; onde: string; avisar?: (texto: string) => void; fechar: () => void }) {
  const [link, setLink] = useState<LinkCriado | null>(null)
  const [erro, setErro] = useState(linkLigado() ? '' : 'off')
  const [copiado, setCopiado] = useState(false)
  const qr = useMemo(() => (link ? svgDoQr(link.url) : ''), [link])
  const podeCompartilhar = typeof navigator.share === 'function'

  useEffect(() => {
    if (!linkLigado()) return
    if (!navigator.onLine) return setErro('Sem internet: dá para enviar como arquivo.')
    let vivo = true
    criarLink(conteudo.texto)
      .then((l) => {
        if (!vivo) return
        setLink(l)
        evento('enviar', { o_que: conteudo.o_que, onde, como: 'link' })
      })
      .catch((e) => vivo && setErro((e as Error).message))
    return () => {
      vivo = false
    }
  }, [])

  const copiar = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link.url)
      setCopiado(true)
    } catch {
      avisar?.('Não consegui copiar. Segure o link para copiar.')
    }
  }

  const compartilhar = async () => {
    if (!link) return
    try {
      await navigator.share({ title: conteudo.titulo, text: `${conteudo.titulo} no tatino. (o link vale até ${hora(link.expiraEm)})`, url: link.url })
    } catch {
      /* cancelado */
    }
  }

  const comoArquivo = async () => {
    evento('enviar', { o_que: conteudo.o_que, onde, como: 'arquivo' })
    const r = await enviarArquivo(conteudo.nome, conteudo.texto, conteudo.mensagem)
    if (r === 'baixado') avisar?.('Arquivo salvo em Downloads.')
    if (r !== 'cancelado') fechar()
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal enviar" role="dialog" aria-modal="true" aria-labelledby="titulo-enviar">
        <h2 id="titulo-enviar">Enviar {conteudo.o_que === 'baralho' ? 'baralho' : 'cartão'}</h2>

        {erro !== 'off' && (
          <>
            {!link && !erro && <p class="dica" role="status">Gerando o link…</p>}
            {erro && (
              <p class="resultado erro" role="alert">
                {erro}
              </p>
            )}
            {link && (
              <>
                <div class="qr" role="img" aria-label="QR code do link" dangerouslySetInnerHTML={{ __html: qr }} />
                <p class="dica">Aponte a câmera do outro celular para o código, ou mande o link. Vale até {hora(link.expiraEm)} (2 horas) e depois some.</p>
                <input class="link-gerado" readOnly value={link.url} aria-label="Link" onFocus={(e) => (e.target as HTMLInputElement).select()} />
                {podeCompartilhar && (
                  <button class="btn principal" onClick={compartilhar}>
                    Compartilhar link
                  </button>
                )}
                <button class={`btn ${podeCompartilhar ? 'secundario' : 'principal'}`} onClick={copiar}>
                  {copiado ? 'Link copiado ✓' : 'Copiar link'}
                </button>
              </>
            )}
          </>
        )}

        <button class={`btn ${erro ? 'principal' : 'secundario'}`} onClick={comoArquivo}>
          Enviar como arquivo
        </button>
        <button class="btn terciario" onClick={fechar}>
          Fechar
        </button>
      </div>
    </div>
  )
}
