import { useEffect, useState } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'
import { pedirPersistencia } from '../core/db'
import { aparelhoDeTeste } from '../core/telemetria'
import type { OpcoesFila } from '../core/fila'
import { Aparencia } from './Aparencia'
import { Aprender } from './Aprender'
import { Backup } from './Backup'
import { Baralhos } from './Baralhos'
import { ColarLista } from './ColarLista'
import { ConfigBaralho } from './ConfigBaralho'
import { CriarComIA } from './CriarComIA'
import { EditarCartao } from './EditarCartao'
import { useBaralhos } from './estado'
import { Inicio } from './Inicio'
import { Revisar } from './Revisar'
import { Sessao, type Limite, type Modo } from './Sessao'

export type Tela =
  | { nome: 'baralhos' }
  | { nome: 'baralho'; id: string }
  | { nome: 'sessao'; id: string; modo: Modo; opcoes: OpcoesFila; limite?: Limite }
  | { nome: 'revisar'; id: string }
  | { nome: 'config'; id: string }
  | { nome: 'cartao'; id: string; cartaoId?: string; tema?: string }
  | { nome: 'colar'; id: string }
  | { nome: 'backup' }
  | { nome: 'aparencia' }
  | { nome: 'aprender'; pedido?: string }
  | { nome: 'ia'; id: string; assunto?: string; temaId?: string }

export interface Aviso {
  texto: string
  desfazer?: () => void
}

export interface Navegacao {
  ir: (t: Tela) => void
  voltar: () => void
  /** Troca a tela atual por outra (o voltar não retorna a ela). */
  substituir: (t: Tela) => void
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
  } = useRegisterSW({
    // O app instalado fica aberto em segundo plano e não navega de novo, então o navegador
    // não procura versão nova sozinho. Procura ao voltar para o app e a cada hora.
    onRegisteredSW(_url, registro) {
      if (!registro) return
      const procurar = () => {
        if (navigator.onLine) registro.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') procurar()
      })
      setInterval(procurar, 60 * 60 * 1000)
    },
  })

  // Na tela inicial não há nada a perder: aplica a versão nova sem esperar o toque em "Atualizar".
  // Nas outras telas (sessão, editor…) o aviso continua, para não recarregar no meio do uso.
  const naInicial = pilha.length === 1 && pilha[0].nome === 'baralhos'
  useEffect(() => {
    if (atualizar && naInicial) updateServiceWorker(true)
  }, [atualizar, naInicial])

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
    substituir: (t) => {
      setPilha((p) => [...p.slice(0, -1), t])
      window.scrollTo(0, 0)
    },
    mudou: () => setVersao((v) => v + 1),
    avisar: setAviso,
  }

  const tela = pilha[pilha.length - 1]
  const baralho = 'id' in tela ? baralhos?.find((b) => b.id === tela.id) : undefined
  const carregando = !baralhos || ('id' in tela && !baralho)

  let conteudo
  if (!baralhos) conteudo = <main class="tela"><p>Carregando…</p></main>
  else if (tela.nome === 'baralhos') conteudo = <Baralhos baralhos={baralhos} nav={nav} versao={versao} />
  else if (tela.nome === 'backup') conteudo = <Backup sair={nav.voltar} />
  else if (tela.nome === 'aparencia') conteudo = <Aparencia nav={nav} />
  else if (tela.nome === 'aprender') conteudo = <Aprender pedido={tela.pedido} nav={nav} />
  else if (carregando || !baralho)
    // Logo depois de criar um baralho a lista ainda está recarregando.
    conteudo = (
      <main class="tela">
        <p>Carregando…</p>
        <button class="link" onClick={nav.voltar}>Voltar</button>
      </main>
    )
  else if (tela.nome === 'baralho') conteudo = <Inicio baralho={baralho} nav={nav} versao={versao} />
  else if (tela.nome === 'ia') conteudo = <CriarComIA baralho={baralho} assuntoInicial={tela.assunto} temaId={tela.temaId} nav={nav} />
  else if (tela.nome === 'sessao') conteudo = <Sessao baralho={baralho} modo={tela.modo} opcoes={tela.opcoes} limite={tela.limite} sair={nav.voltar} criarMais={(assunto, temaId) => nav.substituir({ nome: 'ia', id: baralho.id, assunto, temaId })} />
  else if (tela.nome === 'revisar') conteudo = <Revisar baralho={baralho} nav={nav} />
  else if (tela.nome === 'cartao') conteudo = <EditarCartao key={tela.cartaoId ?? 'novo'} baralho={baralho} cartaoId={tela.cartaoId} temaInicial={tela.tema} nav={nav} />
  else if (tela.nome === 'colar') conteudo = <ColarLista baralho={baralho} nav={nav} />
  // A chave remonta o formulário quando o baralho muda (ex.: cartões e temas criados com IA);
  // sem ela, a tela abre com os temas antigos e "Salvar alterações" apagaria os novos.
  else conteudo = <ConfigBaralho key={`${baralho.id}-${baralho.atualizadoEm ?? 0}`} baralho={baralho} nav={nav} />

  return (
    <>
      {atualizar && (
        <div class="aviso-atualizacao" role="status" aria-live="polite">
          <span>Nova versão disponível.</span>
          <button class="btn pequeno" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </button>
        </div>
      )}
      {conteudo}
      <footer class="rodape-versao">tatino. v{__VERSAO__}{aparelhoDeTeste() && ' · aparelho de teste'}</footer>
      {aviso && (
        <div class="toast" role="status" aria-live="polite">
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
