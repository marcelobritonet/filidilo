import qrcode from 'qrcode-generator'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { linkLigado } from '../core/link'
import { linkPara, type ComoLink } from '../core/linksGuardados'
import { evento, registrarErro } from '../core/telemetria'
import { enviarArquivo, type ConteudoEnvio } from './enviar'

/** Gera o SVG do QR code no aparelho (o link é a única entrada). */
function svgDoQr(url: string): string {
  const q = qrcode(0, 'M')
  q.addData(url)
  q.make()
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
}

/** Texto que vai com o link no "Compartilhar" (WhatsApp etc.); a prévia com o nome do baralho vem da página pública do link. */
export function textoDoLink(c: Pick<ConteudoEnvio, 'o_que' | 'nomeBaralho' | 'cartoes' | 'progresso'>): string {
  if (c.o_que !== 'baralho') return 'Consegue responder este cartão do Filidilo?'
  if (c.progresso) return `${c.nomeBaralho} no Filidilo, com o meu progresso.`
  return `Bora estudar ${c.nomeBaralho} comigo? ${c.cartoes === 1 ? 'É 1 cartão' : `São ${c.cartoes} cartões`} no Filidilo.`
}

/** O mesmo baralho com o progresso de quem envia (null se ela ainda não estudou nada dele). */
export type ComProgresso = () => Promise<{ conteudo: ConteudoEnvio; estudados: number } | null>

interface Link {
  url: string
  como: ComoLink
}

/**
 * Enviar baralho ou cartão: um link (30 dias, reaproveitado por baralho: ver linksGuardados.ts),
 * com Compartilhar e Copiar à vista; o QR code (para ler noutro celular) e o envio como arquivo
 * (funciona sem internet) ficam embaixo, discretos. Nada de prazo nem do endereço escrito.
 * Para baralho, uma caixa (desmarcada) inclui o progresso, para levar a outro aparelho dela.
 */
export function EnviarModal({ conteudo: semProgresso, comProgresso, onde, avisar, fechar, desafiar }: { conteudo: ConteudoEnvio; comProgresso?: ComProgresso; onde: string; avisar?: (texto: string) => void; fechar: () => void; /** Cartão: abre o "Desafiar amigos" (imagem para story ou grupo). */ desafiar?: () => void }) {
  const [opcaoProgresso, setOpcaoProgresso] = useState<{ conteudo: ConteudoEnvio; estudados: number } | null>(null)
  const [incluir, setIncluir] = useState(false)
  const conteudo = incluir && opcaoProgresso ? opcaoProgresso.conteudo : semProgresso
  const [links, setLinks] = useState<Record<string, Link>>({})
  const chave = incluir ? 'com' : 'sem'
  const link = links[chave] ?? null
  const [erro, setErro] = useState(linkLigado() ? '' : 'off')
  const [copiado, setCopiado] = useState(false)
  const [verQr, setVerQr] = useState(false)
  const qr = useMemo(() => (link && verQr ? svgDoQr(link.url) : ''), [link, verQr])
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
    linkPara(conteudo.id, conteudo.baralho, conteudo.texto)
      .then((l) => {
        if (!vivo) return
        setLinks((m) => ({ ...m, [chave]: { url: l.url, como: l.como } }))
        evento('enviar', { o_que: conteudo.o_que, cartoes: conteudo.cartoes, onde, como: 'link', progresso: incluir, link: l.como })
      })
      .catch((e) => {
        if (!vivo) return
        registrarErro('enviar_link', e)
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
      avisar?.('Não consegui copiar o link.')
    }
  }

  const compartilhar = async () => {
    if (!link) return
    try {
      await navigator.share({ title: conteudo.titulo, text: textoDoLink(conteudo), url: link.url })
    } catch {
      /* cancelado */
    }
  }

  const mostrarQr = () => {
    if (!verQr) evento('enviar_qr', { o_que: conteudo.o_que, onde })
    setVerQr((v) => !v)
  }

  const comoArquivo = async () => {
    evento('enviar', { o_que: conteudo.o_que, cartoes: conteudo.cartoes, onde, como: 'arquivo', progresso: incluir })
    const r = await enviarArquivo(conteudo.nome, conteudo.texto, conteudo.mensagem)
    if (r === 'baixado') avisar?.('Arquivo salvo em Downloads.')
    if (r !== 'cancelado') fechar()
  }

  const semLink = erro !== ''

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal enviar" role="dialog" aria-modal="true" aria-labelledby="titulo-enviar">
        <div class="enviar-topo">
          <h2 id="titulo-enviar">Enviar {conteudo.o_que === 'baralho' ? 'baralho' : 'cartão'}</h2>
          <button class="fechar-x" aria-label="Fechar" onClick={fechar}>
            ×
          </button>
        </div>

        {desafiar && linkLigado() && (
          <button class="cartao-acao desafiar" onClick={desafiar}>
            <strong>Desafiar amigos</strong>
            <small>Imagem com a pergunta para o story ou o grupo; quem abrir responde no Filidilo.</small>
          </button>
        )}

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

        {erro && erro !== 'off' && (
          <p class="resultado erro" role="alert">
            {erro}
          </p>
        )}

        {!semLink && (
          <>
            {podeCompartilhar && (
              <button class="btn principal" disabled={!link} onClick={compartilhar}>
                {link ? 'Compartilhar link' : 'Preparando o link…'}
              </button>
            )}
            <button class={`btn ${podeCompartilhar ? 'secundario' : 'principal'}`} disabled={!link} onClick={copiar}>
              {copiado ? 'Link copiado ✓' : !link && !podeCompartilhar ? 'Preparando o link…' : 'Copiar link'}
            </button>
            {verQr && link && (
              <div class="enviar-qr">
                <div class="qr" role="img" aria-label="QR code do link" dangerouslySetInnerHTML={{ __html: qr }} />
                <p class="dica">Aponte a câmera do outro celular.</p>
              </div>
            )}
          </>
        )}

        {semLink ? (
          <button class="btn principal" onClick={comoArquivo}>
            Enviar como arquivo
          </button>
        ) : (
          <div class="enviar-mais">
            <button class="btn terciario" disabled={!link} aria-expanded={verQr} onClick={mostrarQr}>
              {verQr ? 'Esconder QR code' : 'Mostrar QR code'}
            </button>
            <button class="btn terciario" onClick={comoArquivo}>
              Enviar como arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
