import { useEffect, useState } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'
import { pedirPersistencia } from '../core/db'
import type { OpcoesFila } from '../core/fila'
import { Backup } from './Backup'
import { Baralhos } from './Baralhos'
import { ConfigBaralho } from './ConfigBaralho'
import { useBaralhos } from './estado'
import { Inicio } from './Inicio'
import { Revisar } from './Revisar'
import { Sessao, type Modo } from './Sessao'

export type Tela =
  | { nome: 'baralhos' }
  | { nome: 'baralho'; id: string }
  | { nome: 'sessao'; id: string; modo: Modo; opcoes: OpcoesFila }
  | { nome: 'revisar'; id: string }
  | { nome: 'config'; id: string }
  | { nome: 'backup' }

export interface Aviso {
  texto: string
  desfazer?: () => void
}

export interface Navegacao {
  ir: (t: Tela) => void
  voltar: () => void
  /** Recarrega listas e progresso depois de uma mudança. */
  mudou: () => void
  avisar: (a: Aviso) => void
}

export function App() {
  // Pilha de telas sincronizada com o histórico: o "voltar" do Android volta uma tela.
  const [pilha, setPilha] = useState<Tela[]>([{ nome: 'baralhos' }])
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const baralhos = useBaralhos(versao)
  const {
    needRefresh: [atualizar],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    history.replaceState({ n: 0 }, '')
    const aoVoltar = () => {
      const n = (history.state?.n as number | undefined) ?? 0
      setPilha((p) => p.slice(0, n + 1))
      setVersao((v) => v + 1)
    }
    window.addEventListener('popstate', aoVoltar)
    pedirPersistencia()
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 7000)
    return () => clearTimeout(t)
  }, [aviso])

  const nav: Navegacao = {
    ir: (t) => {
      setPilha((p) => {
        history.pushState({ n: p.length }, '')
        return [...p, t]
      })
      window.scrollTo(0, 0)
    },
    voltar: () => history.back(),
    mudou: () => setVersao((v) => v + 1),
    avisar: setAviso,
  }

  const tela = pilha[pilha.length - 1]
  const baralho = 'id' in tela ? baralhos?.find((b) => b.id === tela.id) : undefined
  const carregando = !baralhos || ('id' in tela && !baralho)

  let conteudo
  if (!baralhos) conteudo = <main class="tela"><p>Carregando…</p></main>
  else if (tela.nome === 'baralhos') conteudo = <Baralhos baralhos={baralhos} nav={nav} versao={versao} />
  else if (tela.nome === 'backup') conteudo = <Backup baralhos={baralhos} sair={nav.voltar} />
  else if (carregando || !baralho)
    // Logo depois de criar um baralho a lista ainda está recarregando.
    conteudo = (
      <main class="tela">
        <p>Carregando…</p>
        <button class="link" onClick={nav.voltar}>Voltar</button>
      </main>
    )
  else if (tela.nome === 'baralho') conteudo = <Inicio baralho={baralho} nav={nav} versao={versao} />
  else if (tela.nome === 'sessao') conteudo = <Sessao baralho={baralho} modo={tela.modo} opcoes={tela.opcoes} sair={nav.voltar} />
  else if (tela.nome === 'revisar') conteudo = <Revisar baralho={baralho} sair={nav.voltar} />
  else conteudo = <ConfigBaralho baralho={baralho} nav={nav} />

  return (
    <>
      {atualizar && (
        <div class="aviso-atualizacao" role="status">
          <span>Nova versão disponível.</span>
          <button class="btn pequeno" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </button>
        </div>
      )}
      {conteudo}
      {aviso && (
        <div class="toast" role="status">
          <span>{aviso.texto}</span>
          {aviso.desfazer && (
            <button
              class="link"
              onClick={() => {
                aviso.desfazer!()
                setAviso(null)
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      )}
    </>
  )
}
