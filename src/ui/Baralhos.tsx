import { evento } from '../core/telemetria'
import { useEffect, useState } from 'preact/hooks'
import { lerRecebido, planejar, type CartoesRecebidos, type PlanoImportacao } from '../core/compartilhar'
import { chave, dominado } from '../core/srs'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { useEstados } from './estado'
import { Importar, ImportarCartoes } from './Importar'
import { Marca } from './Marca'
import { pegarRecebido } from './recebido'

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
}

const SEM_INTERNET = 'Precisa de internet para falar com a IA.'

/** Faixa do texto digitado, só para o evento: curto, médio ou longo. */
const faixa = (t: string): 'curto' | 'medio' | 'longo' => (t.length <= 20 ? 'curto' : t.length <= 60 ? 'medio' : 'longo')

export function Baralhos({ baralhos, nav, versao }: { baralhos: Baralho[]; nav: Navegacao; versao: number }) {
  const estados = useEstados(versao)
  const [pedido, setPedido] = useState('')
  const [semInternet, setSemInternet] = useState<'' | 'campo' | 'botao'>('')
  const [instalar, setInstalar] = useState<EventoInstalar | null>(null)
  const [plano, setPlano] = useState<PlanoImportacao | null>(null)
  const [cartoesRecebidos, setCartoesRecebidos] = useState<CartoesRecebidos | null>(null)
  const [erro, setErro] = useState('')

  // Chegou pelo "Compartilhar" do Android (WhatsApp → Compartilhar → tatino.)?
  useEffect(() => {
    pegarRecebido().then(async (r) => {
      if (!r) return
      if ('erro' in r) return setErro(r.erro)
      try {
        setErro('')
        const lido = lerRecebido(r.texto)
        if (lido.tipo === 'cartoes') setCartoesRecebidos(lido)
        else setPlano(await planejar(lido.baralho))
      } catch (err) {
        setErro((err as Error).message)
      }
    })
  }, [])

  useEffect(() => {
    const f = (e: Event) => {
      e.preventDefault()
      setInstalar(e as EventoInstalar)
    }
    window.addEventListener('beforeinstallprompt', f)
    return () => window.removeEventListener('beforeinstallprompt', f)
  }, [])

  /** Abre o fluxo Aprender; sem internet, avisa e não abre. */
  const aprender = (de: 'campo' | 'botao') => {
    const texto = de === 'campo' ? pedido.trim() : ''
    evento('aprender_aberto', { de, tamanho: faixa(texto) })
    if (navigator.onLine === false) return setSemInternet(de)
    setSemInternet('')
    nav.ir(texto ? { nome: 'aprender', pedido: texto } : { nome: 'aprender' })
  }

  return (
    <main class="tela inicio">
      <header class="cabecalho">
        <Marca />
        <h1>Meus baralhos</h1>
      </header>

      <section class="bloco aprender">
        <label class="campo">
          Aprender uma coisa nova hoje
          <input class="texto" value={pedido} placeholder="Ex.: espanhol para viajar, revisão de Cálculo 1, história da arte" onInput={(e) => setPedido((e.target as HTMLInputElement).value)} />
        </label>
        <button class="btn principal" disabled={pedido.trim().length < 3} onClick={() => aprender('campo')}>
          Começar
        </button>
        {semInternet === 'campo' && (
          <p class="resultado erro" role="alert">
            {SEM_INTERNET}
          </p>
        )}
      </section>

      {instalar && (
        <button class="btn secundario" onClick={() => instalar.prompt().then(() => setInstalar(null))}>
          Instalar o app no celular
        </button>
      )}

      <ul class="lista-baralhos">
        {baralhos.map((b) => {
          const total = b.cartoes.length
          const dom = estados ? b.cartoes.filter((c) => dominado(estados.get(chave(b.id, c.id)))).length : 0
          return (
            <li>
              <button class="baralho-item cartao-acao" onClick={() => nav.ir({ nome: 'baralho', id: b.id })}>
                <span class="titulo">{b.titulo}</span>
                <span class="detalhe">
                  {total} {total === 1 ? 'cartão' : 'cartões'}
                </span>
                <span class="barra" aria-hidden="true">
                  <span style={{ width: `${total ? (100 * dom) / total : 0}%` }} />
                </span>
                <span class="num">
                  {dom} de {total} dominados
                </span>
              </button>
            </li>
          )
        })}
        {!baralhos.length && <p class="dica centro">Nenhum baralho ainda. Comece acima ou crie o primeiro abaixo.</p>}
      </ul>

      <section class="acoes">
        <button class="btn secundario" onClick={() => aprender('botao')}>
          Novo baralho
        </button>
        {semInternet === 'botao' && (
          <p class="resultado erro" role="alert">
            {SEM_INTERNET}
          </p>
        )}
        {erro && (
          <p class="resultado erro" role="alert">
            ✕ {erro}
          </p>
        )}
      </section>

      <nav class="rodape" aria-label="Mais opções">
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'backup' })}>
          Backup
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'aparencia' })}>
          Aparência
        </button>
      </nav>
      <p class="versao">Funciona sem internet · seus cartões ficam neste aparelho</p>
      {plano && <Importar plano={plano} nav={nav} fechar={() => setPlano(null)} />}
      {cartoesRecebidos && <ImportarCartoes recebido={cartoesRecebidos} baralhos={baralhos} nav={nav} fechar={() => setCartoesRecebidos(null)} />}
    </main>
  )
}
