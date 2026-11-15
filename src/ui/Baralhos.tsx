import { useEffect, useState } from 'preact/hooks'
import { criar } from '../core/baralhos'
import { lerBaralho, planejar, type PlanoImportacao } from '../core/compartilhar'
import { chave, dominado } from '../core/srs'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { textoContagem, useEstados } from './estado'
import { Importar } from './Importar'
import { Marca } from './Marca'
import { pegarRecebido } from './recebido'

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
}

export function Baralhos({ baralhos, nav, versao }: { baralhos: Baralho[]; nav: Navegacao; versao: number }) {
  const estados = useEstados(versao)
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [instalar, setInstalar] = useState<EventoInstalar | null>(null)
  const [plano, setPlano] = useState<PlanoImportacao | null>(null)
  const [erro, setErro] = useState('')

  // Chegou pelo "Compartilhar" do Android (WhatsApp → Compartilhar → tatino.)?
  useEffect(() => {
    pegarRecebido().then(async (r) => {
      if (!r) return
      if ('erro' in r) return setErro(r.erro)
      try {
        setErro('')
        setPlano(await planejar(lerBaralho(r.texto)))
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

  const novo = async (e: Event) => {
    e.preventDefault()
    const b = await criar(nome)
    setNome('')
    setCriando(false)
    nav.mudou()
    // Abre o baralho e já a configuração: ao salvar, volta para a tela do baralho novo.
    nav.ir({ nome: 'baralho', id: b.id })
    nav.ir({ nome: 'config', id: b.id })
  }

  return (
    <main class="tela inicio">
      <header class="cabecalho">
        <Marca />
        <h1>Meus baralhos</h1>
      </header>

      {instalar && (
        <button class="btn secundario" onClick={() => instalar.prompt().then(() => setInstalar(null))}>
          Instalar o app no celular
        </button>
      )}

      <ul class="lista-baralhos">
        {baralhos.map((b) => {
          const total = b.cartoes.length
          const dom = estados ? b.cartoes.filter((c) => dominado(estados.get(chave(b.id, c.id)))).length : 0
          const contagem = textoContagem(b.prova)
          return (
            <li>
              <button class="baralho-item cartao-acao" onClick={() => nav.ir({ nome: 'baralho', id: b.id })}>
                <span class="titulo">{b.titulo}</span>
                <span class="detalhe">
                  {total} {total === 1 ? 'cartão' : 'cartões'}
                  {contagem && <span class="selo">{contagem}</span>}
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
        {!baralhos.length && <p class="dica centro">Nenhum baralho ainda. Crie o primeiro abaixo.</p>}
      </ul>

      {criando ? (
        <form class="bloco" onSubmit={novo}>
          <label class="campo">
            Nome do baralho
            <input class="texto" value={nome} placeholder="Ex.: Física 1" autoFocus onInput={(e) => setNome((e.target as HTMLInputElement).value)} />
          </label>
          <div class="linha">
            <button type="button" class="btn secundario" onClick={() => setCriando(false)}>
              Cancelar
            </button>
            <button type="submit" class="btn principal" disabled={!nome.trim()}>
              Criar
            </button>
          </div>
        </form>
      ) : (
        <section class="acoes">
          <button class="btn principal" onClick={() => setCriando(true)}>
            Novo baralho
          </button>
          <button class="btn secundario" onClick={() => nav.ir({ nome: 'ia' })}>
            Criar com IA
            <small>o Gemini monta os cartões a partir de um PDF, texto ou assunto</small>
          </button>
          <p class="dica">
            Recebeu um baralho? No WhatsApp, segure o arquivo → <strong>Compartilhar</strong> → <strong>tatino.</strong> (com o app instalado no celular).
          </p>
          {erro && (
            <p class="resultado erro" role="alert">
              ✕ {erro}
            </p>
          )}
        </section>
      )}

      <nav class="rodape" aria-label="Mais opções">
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'backup' })}>
          Backup e reportes
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'aparencia' })}>
          Aparência
        </button>
      </nav>
      <p class="versao">Funciona sem internet · seus dados ficam neste aparelho</p>
      {plano && <Importar plano={plano} nav={nav} fechar={() => setPlano(null)} />}
    </main>
  )
}
