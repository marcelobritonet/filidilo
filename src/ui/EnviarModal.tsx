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

/** O mesmo baralho com o progresso de quem envia (null se ela ainda não estudou nada dele). */
export type ComProgresso = () => Promise<{ conteudo: ConteudoEnvio; estudados: number } | null>

/**
 * Enviar baralho ou cartão: gera um link que vale 2 horas (com QR code para ler noutro celular)
 * e, embaixo, a opção de enviar como arquivo, que funciona sem internet.
 * Para baralho, uma caixa (desmarcada) inclui o progresso, para levar a outro aparelho dela.
 */
export function EnviarModal({ conteudo: semProgresso, comProgresso, onde, avisar, fechar }: { conteudo: ConteudoEnvio; comProgresso?: ComProgresso; onde: string; avisar?: (texto: string) => void; fechar: () => void }) {
  const [opcaoProgresso, setOpcaoProgresso] = useState<{ conteudo: ConteudoEnvio; estudados: number } | null>(null)
  const [incluir, setIncluir] = useState(false)
  const conteudo = incluir && opcaoProgresso ? opcaoProgresso.conteudo : semProgresso
  const [links, setLinks] = useState<Record<string, LinkCriado>>({})
  const chave = incluir ? 'com' : 'sem'
  const link = links[chave] ?? null
  const [erro, setErro] = useState(linkLigado() ? '' : 'off')
  const [copiado, setCopiado] = useState(false)
  const qr = useMemo(() => (link ? svgDoQr(link.url) : ''), [link])
  const podeCompartilhar = typeof navigator.share === 'function'

  useEffect(() => {
    let vivo = true
    comProgresso?.()
      .then((r) => vivo && setOpcaoProgresso(r))
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    setCopiado(false)
    if (!linkLigado() || links[chave]) return
    if (!navigator.onLine) return setErro('Sem internet: dá para enviar como arquivo.')
    setErro('')
    let vivo = true
    criarLink(conteudo.texto)
      .then((l) => {
        if (!vivo) return
        setLinks((m) => ({ ...m, [chave]: l }))
        evento('enviar', { o_que: conteudo.o_que, onde, como: 'link', progresso: incluir })
      })
      .catch((e) => {
        if (!vivo) return
        const msg = (e as Error).message
        setErro(incluir && msg.includes('grande demais') ? 'Com o progresso, o baralho fica grande demais para link. Envie como arquivo ou desmarque o progresso.' : msg)
      })
    return () => {
      vivo = false
    }
  }, [chave])

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
    evento('enviar', { o_que: conteudo.o_que, onde, como: 'arquivo', progresso: incluir })
    const r = await enviarArquivo(conteudo.nome, conteudo.texto, conteudo.mensagem)
    if (r === 'baixado') avisar?.('Arquivo salvo em Downloads.')
    if (r !== 'cancelado') fechar()
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal enviar" role="dialog" aria-modal="true" aria-labelledby="titulo-enviar">
        <h2 id="titulo-enviar">Enviar {conteudo.o_que === 'baralho' ? 'baralho' : 'cartão'}</h2>

        {opcaoProgresso && (
          <label class="opcao-check">
            <input type="checkbox" checked={incluir} onChange={(e) => setIncluir((e.target as HTMLInputElement).checked)} />
            <span class="textos">
              <strong>Incluir meu progresso</strong>
              <small>
                Para levar o baralho a outro aparelho seu, com {opcaoProgresso.estudados === 1 ? 'o cartão já estudado' : `os ${opcaoProgresso.estudados} cartões já estudados`}.
              </small>
            </span>
          </label>
        )}

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
