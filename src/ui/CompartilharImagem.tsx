import { useEffect, useRef, useState } from 'preact/hooks'
import type { Formato, Peca } from '../core/artes'
import { evento } from '../core/telemetria'
import { desenhar, imagemPng } from './desenho'

/** Uma das imagens que a pessoa pode escolher (ex.: Resultado ou Conquista). */
export interface OpcaoImagem {
  rotulo: string
  /** A imagem pode mostrar o nome do baralho (aparece a caixa "Mostrar o nome do baralho"). */
  usaNome?: boolean
  /** Monta a peça; `comNome` vem da caixa "Mostrar o nome do baralho". */
  peca: (comNome: boolean) => Peca
}

/**
 * Prévia da imagem para WhatsApp ou story: formato Story (9:16) ou Quadrado, caixa para esconder
 * o nome do baralho e Compartilhar (imagem + texto com o link). Sem compartilhar arquivo
 * (computador): baixa a imagem e copia o texto.
 */
export function CompartilharImagem({ opcoes, onde, avisar, fechar }: { opcoes: OpcaoImagem[]; onde: string; avisar?: (texto: string) => void; fechar: () => void }) {
  const [i, setI] = useState(0)
  const [formato, setFormato] = useState<Formato>('story')
  const [comNome, setComNome] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const peca = opcoes[i].peca(comNome)
  const temNome = !!opcoes[i].usaNome

  useEffect(() => {
    if (canvas.current) desenhar(canvas.current, peca.arte, formato)
  }, [i, formato, comNome])

  const nome = `tatino-${peca.arte.modelo}-${formato}.png`
  const registrar = (como: string) => evento('compartilhar_imagem', { modelo: peca.arte.modelo, formato, como, com_nome: temNome && comNome, onde })

  const compartilhar = async () => {
    setOcupado(true)
    try {
      const arquivo = await imagemPng(peca.arte, formato, nome)
      if (navigator.canShare?.({ files: [arquivo] })) {
        try {
          // O link vai no texto: o WhatsApp descarta o campo `url` quando há arquivo junto.
          await navigator.share({ files: [arquivo], text: peca.texto })
          registrar('compartilhar')
        } catch (e) {
          if ((e as Error).name !== 'AbortError') avisar?.('Não consegui compartilhar. Tente baixar a imagem.')
        }
        return
      }
      baixar(arquivo)
      registrar('baixar')
      const copiou = await copiarTexto(true)
      avisar?.(copiou ? 'Imagem salva em Downloads e texto copiado.' : 'Imagem salva em Downloads.')
    } finally {
      setOcupado(false)
    }
  }

  const baixar = (arquivo: File) => {
    const url = URL.createObjectURL(arquivo)
    const a = document.createElement('a')
    a.href = url
    a.download = arquivo.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const copiarTexto = async (silencioso = false): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(peca.texto)
      setCopiado(true)
      return true
    } catch {
      if (!silencioso) avisar?.('Não consegui copiar o texto.')
      return false
    }
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal compartilhar-imagem" role="dialog" aria-modal="true" aria-labelledby="titulo-compartilhar">
        <h2 id="titulo-compartilhar">Compartilhar</h2>

        {opcoes.length > 1 && (
          <div class="segmentado" role="group" aria-label="Qual imagem">
            {opcoes.map((o, k) => (
              <button class={k === i ? 'ativo' : ''} aria-pressed={k === i} onClick={() => setI(k)}>
                {o.rotulo}
              </button>
            ))}
          </div>
        )}

        <div class="segmentado" role="group" aria-label="Formato">
          <button class={formato === 'story' ? 'ativo' : ''} aria-pressed={formato === 'story'} onClick={() => setFormato('story')}>
            Story
          </button>
          <button class={formato === 'quadrado' ? 'ativo' : ''} aria-pressed={formato === 'quadrado'} onClick={() => setFormato('quadrado')}>
            Quadrado
          </button>
        </div>

        <canvas ref={canvas} class={`previa ${formato}`} role="img" aria-label="Prévia da imagem" />

        {temNome && (
          <label class="opcao-check">
            <input type="checkbox" checked={comNome} onChange={(e) => setComNome((e.target as HTMLInputElement).checked)} />
            <span class="textos">
              <strong>Mostrar o nome do baralho</strong>
            </span>
          </label>
        )}

        <button class="btn principal" disabled={ocupado} onClick={compartilhar}>
          {ocupado ? 'Gerando a imagem…' : 'Compartilhar imagem'}
        </button>
        <button class="btn secundario" onClick={() => copiarTexto()}>
          {copiado ? 'Texto copiado ✓' : 'Copiar o texto com o link'}
        </button>
        <p class="dica">No Instagram, escolha Story e cole o link num adesivo de link.</p>
        <button class="btn terciario" onClick={fechar}>
          Fechar
        </button>
      </div>
    </div>
  )
}

/** Endereço do app, para o texto e o QR do convite. */
export const urlApp = () => `${location.origin}${import.meta.env.BASE_URL}`
