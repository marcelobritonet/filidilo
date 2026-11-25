import qrcode from 'qrcode-generator'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { db } from '../core/db'
import { comecar, desligar, formatarCodigo, ligar, linkDoCodigo, mensagemDoMotivo, ouvirSync, sincronizar, syncDisponivel, trocarCodigo, type EstadoSync, type Resultado } from '../core/sync'
import { evento } from '../core/telemetria'
import type { Navegacao } from './App'
import { Icone } from './Icone'

/** De onde a pessoa chegou na tela (para as estatísticas). */
export type DeOndeSync = 'icone' | 'rodape' | 'backup' | 'link'

function svgDoQr(url: string): string {
  const q = qrcode(0, 'M')
  q.addData(url)
  q.make()
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
}

const hora = (t: number) => {
  const d = new Date(t)
  const hoje = new Date().toDateString() === d.toDateString()
  const h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return hoje ? `hoje às ${h}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${h}`
}

/** Estado do sync para a interface; `undefined` enquanto lê. */
export function useSync(): { estado: EstadoSync | null | undefined; rodando: boolean } {
  const [estado, setEstado] = useState<EstadoSync | null | undefined>(undefined)
  const [rodando, setRodando] = useState(false)
  useEffect(
    () =>
      ouvirSync((e, r) => {
        setEstado(e)
        setRodando(r)
      }),
    [],
  )
  return { estado, rodando }
}

/** Ícone ⟳ do cabeçalho, com um ponto do estado: verde em dia, amarelo pendente, vermelho erro; sem ponto, desligado. */
export function BotaoSync({ abrir }: { abrir: () => void }) {
  const { estado, rodando } = useSync()
  if (!syncDisponivel()) return null
  const tom = !estado ? '' : estado.erro && estado.erro !== 'offline' ? 'erro' : estado.pendente ? 'pendente' : 'ok'
  const rotulo = !estado ? 'Sincronizar aparelhos' : rodando ? 'Sincronizando' : tom === 'erro' ? 'Sincronização com erro' : tom === 'pendente' ? 'Sincronização pendente' : 'Sincronizado'
  return (
    <button class={`icone-btn botao-sync${rodando ? ' girando' : ''}`} aria-label={rotulo} title={rotulo} onClick={abrir}>
      <Icone nome="sync" />
      {tom && <span class={`ponto-sync ${tom}`} aria-hidden="true" />}
    </button>
  )
}

export function Sincronizar({ nav, de, codigoRecebido }: { nav: Navegacao; de: DeOndeSync; codigoRecebido?: string }) {
  const { estado, rodando } = useSync()
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null)
  const [digitando, setDigitando] = useState(false)
  const [digitado, setDigitado] = useState('')
  const [verCodigo, setVerCodigo] = useState(false)
  const [confirmar, setConfirmar] = useState<'trocar' | 'desligar' | null>(null)
  const [recebido, setRecebido] = useState(codigoRecebido)
  const [daqui, setDaqui] = useState<{ baralhos: number; respostas: number } | null>(null)

  useEffect(() => {
    if (estado === undefined) return
    evento('sync_aberto', { de, ligado: !!estado })
  }, [estado === undefined])

  useEffect(() => {
    if (!recebido) return
    void Promise.all([db.baralhos.count(), db.revisoes.count()]).then(([baralhos, respostas]) => setDaqui({ baralhos, respostas }))
  }, [recebido])

  const qr = useMemo(() => (estado && verCodigo ? svgDoQr(linkDoCodigo(estado.codigo)) : ''), [estado?.codigo, verCodigo])

  async function fazer(acao: () => Promise<Resultado>, ok: (r: Resultado) => string) {
    setOcupado(true)
    setMsg(null)
    try {
      const r = await acao()
      if (r.ok) {
        setMsg({ texto: ok(r) })
        if (r.baixou) nav.mudou()
      } else setMsg({ texto: mensagemDoMotivo(r.motivo ?? 'rede'), erro: true })
      return r
    } finally {
      setOcupado(false)
    }
  }

  const trouxe = (r: Resultado) => (r.baixou ? 'Pronto. Chegaram novidades do outro aparelho.' : 'Pronto. Tudo em dia.')

  const ligarCom = async (texto: string, como: 'codigo' | 'qr') => {
    const r = await fazer(() => ligar(texto, como), (r) => `Aparelho ligado. ${r.baixou ? 'Seus baralhos e o progresso chegaram.' : 'Tudo em dia.'}`)
    if (r.ok) {
      setDigitando(false)
      setDigitado('')
    }
  }

  const copiar = async () => {
    if (!estado) return
    evento('sync_codigo_copiado')
    try {
      await navigator.clipboard.writeText(formatarCodigo(estado.codigo))
      nav.avisar({ texto: 'Código copiado.' })
    } catch {
      nav.avisar({ texto: 'Não consegui copiar. Anote o código.' })
    }
  }

  if (!syncDisponivel())
    return (
      <main class="tela sincronizar">
        <Barra voltar={nav.voltar} />
        <section class="bloco">
          <p>A sincronização não está disponível nesta versão do app.</p>
        </section>
      </main>
    )

  return (
    <main class="tela sincronizar">
      <Barra voltar={nav.voltar} />

      {estado === null && (
        <section class="bloco">
          <p>Use seus baralhos e o progresso em mais de um aparelho. Sem conta e sem senha: um código liga os aparelhos.</p>
          <button class="btn principal" disabled={ocupado} onClick={() => fazer(comecar, () => 'Pronto. Agora ligue o outro aparelho com o código abaixo.').then((r) => r.ok && setVerCodigo(true))}>
            {ocupado && !digitando ? 'Preparando…' : 'Começar neste aparelho'}
          </button>
          {!digitando ? (
            <button class="btn secundario" disabled={ocupado} onClick={() => setDigitando(true)}>
              Tenho um código
            </button>
          ) : (
            <form
              class="codigo-sync"
              onSubmit={(e) => {
                e.preventDefault()
                void ligarCom(digitado, 'codigo')
              }}
            >
              <label for="codigo-sync">Código do outro aparelho</label>
              <input id="codigo-sync" autoFocus autoComplete="off" autoCapitalize="characters" spellcheck={false} placeholder="FILI-7K3M-Q9XA-…" value={digitado} onInput={(e) => setDigitado((e.target as HTMLInputElement).value)} />
              <button class="btn principal" type="submit" disabled={ocupado || !digitado.trim()}>
                {ocupado ? 'Ligando…' : 'Ligar este aparelho'}
              </button>
            </form>
          )}
          <p class="dica">O app continua funcionando sem internet. Quando houver conexão, ele troca as novidades com os outros aparelhos.</p>
          <p class="dica">Tudo vai cifrado: nem nós conseguimos ler.</p>
        </section>
      )}

      {estado && (
        <>
          <section class="bloco">
            <button class="btn principal" disabled={ocupado || rodando} onClick={() => fazer(() => sincronizar('botao'), trouxe)}>
              <Icone nome="sync" tamanho={20} /> {rodando ? 'Sincronizando…' : 'Sincronizar agora'}
            </button>
            <p class="dica centro">
              {estado.erro && estado.erro !== 'offline' ? mensagemDoMotivo(estado.erro) : estado.pendente ? 'Há novidades esperando internet para subir.' : estado.ultimaSync ? `Sincronizado ${hora(estado.ultimaSync)}` : 'Ainda não sincronizou.'}
            </p>
          </section>

          <section class="bloco">
            <h2>Ligar outro aparelho</h2>
            {!verCodigo ? (
              <button
                class="btn secundario"
                onClick={() => {
                  evento('sync_codigo_mostrado')
                  setVerCodigo(true)
                }}
              >
                Mostrar código
              </button>
            ) : (
              <div class="mostrar-codigo">
                <div class="qr" role="img" aria-label="QR code para ligar outro aparelho" dangerouslySetInnerHTML={{ __html: qr }} />
                <p class="codigo">{formatarCodigo(estado.codigo)}</p>
                <p class="dica">No outro aparelho, aponte a câmera para o QR, ou abra Sincronizar → Tenho um código.</p>
                <button class="btn secundario" onClick={copiar}>
                  Copiar código
                </button>
              </div>
            )}
            <p class="dica">Guarde este código. Sem ele não há como recuperar os dados se você perder todos os aparelhos. Quem tiver o código vê e muda seus baralhos.</p>
          </section>

          <section class="acoes-sync">
            {confirmar ? (
              <div class="bloco">
                <p>{confirmar === 'trocar' ? 'O código atual deixa de valer, inclusive nos seus outros aparelhos: eles precisam ser ligados de novo com o código novo.' : 'Este aparelho para de sincronizar. Os dados daqui ficam, e seus outros aparelhos continuam com o código.'}</p>
                <button
                  class={confirmar === 'desligar' ? 'btn perigo-forte' : 'btn principal'}
                  disabled={ocupado}
                  onClick={async () => {
                    if (confirmar === 'trocar') {
                      const r = await fazer(trocarCodigo, () => 'Código trocado. Ligue os outros aparelhos com o código novo.')
                      if (r.ok) setVerCodigo(true)
                    } else {
                      await desligar()
                      setMsg({ texto: 'Este aparelho não sincroniza mais.' })
                      setVerCodigo(false)
                    }
                    setConfirmar(null)
                  }}
                >
                  {confirmar === 'trocar' ? 'Trocar código' : 'Desligar este aparelho'}
                </button>
                <button class="btn secundario" onClick={() => setConfirmar(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <button class="link" onClick={() => setConfirmar('trocar')}>
                  Trocar código
                </button>
                <button class="link perigo" onClick={() => setConfirmar('desligar')}>
                  Desligar este aparelho
                </button>
              </>
            )}
          </section>
        </>
      )}

      {msg && (
        <p class={`resultado${msg.erro ? ' erro' : ' ok'}`} role="status" aria-live="polite">
          {msg.texto}
        </p>
      )}

      {recebido && estado !== undefined && (
        <div class="modal-fundo">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-ligar">
            <h2 id="titulo-ligar">{estado ? 'Ligar a outro código?' : 'Ligar este aparelho?'}</h2>
            <p>
              {estado
                ? 'Este aparelho já sincroniza com outro código. Se ligar a este, ele passa a usar o novo. Os dados daqui se juntam aos de lá.'
                : 'Os baralhos e o progresso deste aparelho se juntam aos do outro. Nada se perde.'}
            </p>
            {daqui && (daqui.baralhos > 0 || daqui.respostas > 0) && (
              <p class="dica">
                Aqui: {daqui.baralhos} {daqui.baralhos === 1 ? 'baralho' : 'baralhos'} · {daqui.respostas} {daqui.respostas === 1 ? 'resposta' : 'respostas'}
              </p>
            )}
            <button
              class="btn principal"
              autoFocus
              disabled={ocupado}
              onClick={async () => {
                const c = recebido
                await ligarCom(c, 'qr')
                setRecebido(undefined)
              }}
            >
              {ocupado ? 'Ligando…' : 'Ligar e sincronizar'}
            </button>
            <button
              class="btn secundario"
              disabled={ocupado}
              onClick={() => {
                evento('sync_ligar_cancelado', { como: 'qr' })
                setRecebido(undefined)
              }}
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function Barra({ voltar }: { voltar: () => void }) {
  return (
    <header class="barra-sessao">
      <button class="fechar" aria-label="Voltar" onClick={voltar}>
        ←
      </button>
      <h1 class="titulo-barra">Sincronizar</h1>
      <span />
    </header>
  )
}
