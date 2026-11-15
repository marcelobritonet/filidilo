import { useEffect, useState } from 'preact/hooks'
import { useRegisterSW } from 'virtual:pwa-register/preact'
import { pedirPersistencia } from '../core/db'
import type { OpcoesFila } from '../core/fila'
import { Backup } from './Backup'
import { Inicio } from './Inicio'
import { Revisar } from './Revisar'
import { Sessao, type Modo } from './Sessao'

export type Tela =
  | { nome: 'inicio' }
  | { nome: 'sessao'; modo: Modo; opcoes: OpcoesFila }
  | { nome: 'revisar' }
  | { nome: 'backup' }

export function App() {
  const [tela, setTela] = useState<Tela>({ nome: 'inicio' })
  const [versao, setVersao] = useState(0)
  const {
    needRefresh: [atualizar],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    // Botão "voltar" do Android volta para o início em vez de sair do app.
    const aoVoltar = () => setTela({ nome: 'inicio' })
    window.addEventListener('popstate', aoVoltar)
    pedirPersistencia()
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  const ir = (t: Tela) => {
    if (t.nome === 'inicio') {
      if (history.state?.tela) history.back()
      else setTela(t)
      setVersao((v) => v + 1)
      return
    }
    if (!history.state?.tela) history.pushState({ tela: t.nome }, '')
    setTela(t)
  }

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
      {tela.nome === 'inicio' && <Inicio ir={ir} versao={versao} />}
      {tela.nome === 'sessao' && <Sessao modo={tela.modo} opcoes={tela.opcoes} sair={() => ir({ nome: 'inicio' })} />}
      {tela.nome === 'revisar' && <Revisar sair={() => ir({ nome: 'inicio' })} />}
      {tela.nome === 'backup' && <Backup sair={() => ir({ nome: 'inicio' })} />}
    </>
  )
}
