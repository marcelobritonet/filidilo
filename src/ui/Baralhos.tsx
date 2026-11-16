import { useEffect, useState } from 'preact/hooks'
import { criar, novoId, salvar } from '../core/baralhos'
import { lerRecebido, planejar, type CartoesRecebidos, type PlanoImportacao } from '../core/compartilhar'
import { chave, dominado } from '../core/srs'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { textoContagem, useEstados } from './estado'
import { Importar, ImportarCartoes } from './Importar'
import { Marca } from './Marca'
import { pegarRecebido } from './recebido'

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
}

export function Baralhos({ baralhos, nav, versao }: { baralhos: Baralho[]; nav: Navegacao; versao: number }) {
  const estados = useEstados(versao)
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [prova, setProva] = useState('')
  const [temasTexto, setTemasTexto] = useState('')
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

  const novo = async (e: Event) => {
    e.preventDefault()
    const nomes = [...new Set(temasTexto.split(/[\n,;]/).map((t) => t.trim()).filter(Boolean))]
    const base = await criar(nome)
    const b = await salvar({
      ...base,
      prova: prova || undefined,
      temas: nomes.length ? nomes.map((t) => ({ id: novoId(t), nome: t })) : base.temas,
    })
    setNome('')
    setProva('')
    setTemasTexto('')
    setCriando(false)
    nav.mudou()
    nav.ir({ nome: 'baralho', id: b.id })
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
          <h2>Novo baralho</h2>
          <label class="campo">
            Disciplina
            <input class="texto" value={nome} placeholder="Física 1" autoFocus onInput={(e) => setNome((e.target as HTMLInputElement).value)} />
          </label>
          <label class="campo">
            Temas (opcional, um por linha)
            <textarea rows={3} value={temasTexto} placeholder={'Cinemática\nDinâmica'} onInput={(e) => setTemasTexto((e.target as HTMLTextAreaElement).value)} />
          </label>
          <label class="campo">
            Data da prova (opcional)
            <input class="texto" type="date" value={prova} onInput={(e) => setProva((e.target as HTMLInputElement).value)} />
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
          <p class="dica">
            Recebeu um cartão ou baralho? No WhatsApp, segure o arquivo → <strong>Compartilhar</strong> → <strong>tatino.</strong>
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
          Backup
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'aparencia' })}>
          Aparência
        </button>
      </nav>
      <p class="versao">Funciona sem internet · seus dados ficam neste aparelho</p>
      {plano && <Importar plano={plano} nav={nav} fechar={() => setPlano(null)} />}
      {cartoesRecebidos && <ImportarCartoes recebido={cartoesRecebidos} baralhos={baralhos} nav={nav} fechar={() => setCartoesRecebidos(null)} />}
    </main>
  )
}
