import { evento } from '../core/telemetria'
import { useEffect, useState } from 'preact/hooks'
import { lerRecebido, planejar, type CartoesRecebidos, type PlanoImportacao } from '../core/compartilhar'
import { DesafioRecebido } from './Desafio'
import { ativos as cartoesAtivos } from '../core/cartoes'
import { chave, dominado, vencido, visto } from '../core/srs'
import { fraseDoDia, saudacao } from '../core/saudacao'
import type { Baralho, Cartao } from '../core/types'
import type { Navegacao } from './App'
import { useEstados } from './estado'
import { Importar, ImportarCartoes } from './Importar'
import { Marca } from './Marca'
import { abriuPorLink, pegarRecebido } from './recebido'
import { esquecerPendente, guardarPendente, lerPendente, type RecebidoPendente } from './recebidoPendente'
import type { MotivoLink } from '../core/link'
import { InstalarCard } from './InstalarCard'
import { registrarAbertura } from './instalar'
import { iniciarMarcos, painel, type Semana } from '../core/conquistas'
import { CartaoOfensiva, FioDoDia, SeloOfensiva, usePainelOfensiva } from './Ofensiva'
import { pecaSemana } from '../core/artes'
import { CompartilharImagem, urlApp, type OpcaoImagem } from './CompartilharImagem'
import { ordenar } from '../core/baralhos'
import { OrdenarBaralhos } from './OrdenarBaralhos'
import { BotaoSync, useSync } from './Sincronizar'

const SEM_INTERNET = 'Precisa de internet para falar com a IA.'

/** Cor da logo de cada cartão de baralho, revezando pela posição (--tom-4 é a Noite nos claros e Turquesa+Cobalto nos escuros; --tom-5 é a Névoa, mais fraca nos escuros). */
const TONS = ['var(--marca-turquesa)', 'var(--marca-cobalto)', 'var(--marca-bronze)', 'var(--tom-4)', 'var(--tom-5)']

/** Faixa do texto digitado, só para o evento: curto, médio ou longo. */
/** Título e texto do aviso quando o link (ou o arquivo compartilhado) não abre. */
function textoDoAviso(via: 'arquivo' | 'link', motivo: MotivoLink | undefined, mensagem: string): { titulo: string; texto: string } {
  if (via === 'arquivo') return { titulo: 'Não consegui abrir o arquivo', texto: mensagem }
  if (motivo === 'expirou') return { titulo: 'Este link expirou', texto: 'Peça a quem enviou um link novo.' }
  if (motivo === 'internet') return { titulo: 'Sem internet', texto: 'Conecte-se e abra o link de novo.' }
  return { titulo: 'Não consegui abrir o link', texto: mensagem }
}

function AvisoRecebido({ titulo, texto, fechar }: { titulo: string; texto: string; fechar: () => void }) {
  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-aviso-recebido" aria-describedby="texto-aviso-recebido">
        <h2 id="titulo-aviso-recebido">{titulo}</h2>
        <p id="texto-aviso-recebido">{texto}</p>
        <button class="btn principal" autoFocus onClick={fechar}>
          Entendi
        </button>
      </div>
    </div>
  )
}

const faixa = (t: string): 'curto' | 'medio' | 'longo' => (t.length <= 20 ? 'curto' : t.length <= 60 ? 'medio' : 'longo')

export function Baralhos({ baralhos, nav, versao }: { baralhos: Baralho[]; nav: Navegacao; versao: number }) {
  const estados = useEstados(versao)
  const sync = useSync()
  const [pedido, setPedido] = useState('')
  const [semInternet, setSemInternet] = useState<'' | 'campo' | 'botao'>('')
  const [plano, setPlano] = useState<PlanoImportacao | null>(null)
  // Texto do baralho recebido que está na folha (para guardar se ela deixar para depois).
  const [textoRecebido, setTextoRecebido] = useState('')
  const [pendente, setPendente] = useState<RecebidoPendente | null>(lerPendente)
  const [cartoesRecebidos, setCartoesRecebidos] = useState<CartoesRecebidos | null>(null)
  const [aviso, setAviso] = useState<{ titulo: string; texto: string } | null>(null)
  // Desafio recebido: responde o cartão primeiro; "Salvar" segue para a importação de sempre.
  const [desafio, setDesafio] = useState<{ cartao: Cartao; baralho: Baralho; origem: string; salvar: () => void; rotulo: string } | null>(null)
  const [abrindoLink, setAbrindoLink] = useState(abriuPorLink)
  const [verArquivados, setVerArquivados] = useState(false)
  const [resumo, setResumo] = useState<{ sequencia: number; semana: Semana } | null>(null)
  const [compartilhar, setCompartilhar] = useState<{ opcoes: OpcaoImagem[]; onde: string } | null>(null)
  // Modo Organizar: a lista local muda na hora; cada toque já grava a ordem.
  const [organizando, setOrganizando] = useState<Baralho[] | null>(null)
  const [mexeu, setMexeu] = useState(false)
  const ativos = organizando ?? baralhos.filter((b) => !b.arquivadoEm)
  const ofensiva = usePainelOfensiva(versao)
  const arquivados = baralhos.filter((b) => b.arquivadoEm)

  // Chegou pelo "Compartilhar" do Android (WhatsApp → Compartilhar → Filidilo) ou por um link (?b=<codigo>)?
  useEffect(() => {
    pegarRecebido().then(async (r) => {
      setAbrindoLink(false)
      if (!r) return
      const avisarLink = (ok: boolean, extra: { tipo?: string; motivo?: string } = {}) => r.via === 'link' && evento('link_aberto', { ok, ...extra })
      if ('erro' in r) {
        avisarLink(false, { motivo: r.motivo })
        return setAviso(textoDoAviso(r.via, r.motivo, r.erro))
      }
      try {
        setAviso(null)
        const lido = lerRecebido(r.texto)
        avisarLink(true, { tipo: lido.tipo })
        setTextoRecebido(r.texto)
        if (lido.desafio) {
          evento('desafio_aberto', { junto: lido.tipo === 'baralho' ? 'baralho' : 'cartao', tipo: lido.desafio.tipo })
          if (lido.tipo === 'cartoes') {
            const solto: Baralho = { id: 'desafio', titulo: lido.origem, versao: 1, temas: lido.temas, cartoes: lido.cartoes }
            setDesafio({ cartao: lido.desafio, baralho: solto, origem: lido.origem, rotulo: lido.cartoes.length === 1 ? 'Salvar este cartão' : 'Salvar os cartões', salvar: () => setCartoesRecebidos(lido) })
          } else {
            const p = await planejar(lido.baralho, lido.progresso)
            const n = lido.baralho.cartoes.length
            setDesafio({ cartao: lido.desafio, baralho: lido.baralho, origem: lido.baralho.titulo, rotulo: `Salvar o baralho (${n} ${n === 1 ? 'cartão' : 'cartões'})`, salvar: () => setPlano(p) })
          }
        } else if (lido.tipo === 'cartoes') setCartoesRecebidos(lido)
        else setPlano(await planejar(lido.baralho, lido.progresso))
      } catch (err) {
        avisarLink(false, { motivo: 'conteudo' })
        setAviso({ titulo: r.via === 'link' ? 'Não consegui abrir o link' : 'Não consegui abrir o arquivo', texto: (err as Error).message })
      }
    })
  }, [])

  useEffect(() => registrarAbertura(), [])

  // Marcos: o que já foi atingido antes desta versão fica comemorado em silêncio. Depois, sequência e semana.
  useEffect(() => {
    iniciarMarcos(baralhos)
      .catch(() => undefined)
      .then(() => painel())
      .then(setResumo)
      .catch(() => undefined)
  }, [versao])

  // "Agora não" na folha do baralho recebido: guarda e mostra o lembrete na tela inicial.
  const adiarImportar = () => {
    if (!plano) return
    evento('recebido_adiado', { cartoes: plano.recebido.cartoes.length, atualizar: !!plano.atual })
    guardarPendente({ texto: textoRecebido, titulo: plano.recebido.titulo, cartoes: plano.recebido.cartoes.length })
    setPendente(lerPendente())
    setPlano(null)
  }
  // Adicionou, atualizou ou abriu: o lembrete não serve mais.
  const fecharImportar = () => {
    esquecerPendente()
    setPendente(null)
    setPlano(null)
  }
  const retomarPendente = async () => {
    if (!pendente) return
    try {
      const lido = lerRecebido(pendente.texto)
      if (lido.tipo !== 'baralho') throw new Error('não é baralho')
      evento('recebido_retomado', { cartoes: pendente.cartoes })
      setTextoRecebido(pendente.texto)
      setPlano(await planejar(lido.baralho, lido.progresso))
    } catch {
      esquecerPendente()
      setPendente(null)
      setAviso({ titulo: 'Não consegui abrir o baralho', texto: 'Peça a quem enviou para mandar de novo.' })
    }
  }
  const descartarPendente = () => {
    evento('recebido_descartado', { cartoes: pendente?.cartoes ?? 0 })
    esquecerPendente()
    setPendente(null)
  }

  const semana = resumo?.semana
  const agora = new Date()
  const frase = fraseDoDia(
    {
      baralhos: estados
        ? ativos.map((b) => ({ titulo: b.titulo, revisar: cartoesAtivos(b).filter((c) => estados.has(chave(b.id, c.id)) && vencido(estados.get(chave(b.id, c.id)), agora.getTime())).length }))
        : ativos.map((b) => ({ titulo: b.titulo, revisar: 0 })),
      hojeFeito: !!ofensiva.painel?.hojeFeito,
      sequencia: ofensiva.painel?.sequencia ?? 0,
    },
    agora,
  )
  // A semana para compartilhar abre pelo selo de ofensiva do topo (a tela inicial fica limpa).
  const abrirProgresso = (onde: 'rodape' | 'semana') => {
    evento('progresso_aberto', { onde })
    nav.ir({ nome: 'progresso' })
  }
  const abrirSemana = () => {
    if (!semana || !semana.respostas) return
    evento('semana_aberta')
    setCompartilhar({ onde: 'semana', opcoes: [{ rotulo: 'Minha semana', peca: () => pecaSemana(semana, { urlApp: urlApp(), sequencia: resumo?.sequencia ?? 0 }) }] })
  }

  const mudarOrdem = (lista: Baralho[]) => {
    setOrganizando(lista)
    setMexeu(true)
    ordenar(lista.map((b) => b.id)).catch(() => undefined)
  }
  const alternarOrganizar = () => {
    if (!organizando) {
      setMexeu(false)
      return setOrganizando(ativos)
    }
    if (mexeu) {
      evento('baralhos_ordenados', { total: organizando.length })
      nav.mudou()
    }
    setOrganizando(null)
  }

  /** Abre o fluxo Aprender; sem internet, avisa e não abre. */
  const aprender = (de: 'campo' | 'botao') => {
    const texto = de === 'campo' ? pedido.trim() : ''
    evento('aprender_aberto', { de, tamanho: faixa(texto) })
    if (navigator.onLine === false) return setSemInternet(de)
    setSemInternet('')
    nav.ir(texto ? { nome: 'aprender', pedido: texto } : { nome: 'aprender' })
  }

  if (desafio)
    return (
      <DesafioRecebido
        cartao={desafio.cartao}
        baralho={desafio.baralho}
        origem={desafio.origem}
        salvarRotulo={desafio.rotulo}
        salvar={() => {
          desafio.salvar()
          setDesafio(null)
        }}
        fechar={() => setDesafio(null)}
      />
    )

  return (
    <main class="tela inicio meus-baralhos">
      {ofensiva.painel && !ofensiva.painel.hojeFeito && ofensiva.painel.sequencia > 0 && ativos.length > 0 && <FioDoDia agora={ofensiva.agora} />}
      <header class="cabecalho">
        <div class="cabecalho-ofensiva">
          <Marca />
          <div class="cabecalho-acoes">
            {ofensiva.painel && (ofensiva.painel.sequencia > 0 || ofensiva.painel.folgas > 0) && <SeloOfensiva painel={ofensiva.painel} agora={ofensiva.agora} abrir={abrirSemana} />}
            <BotaoSync abrir={() => nav.ir({ nome: 'sincronizar', de: 'icone' })} />
          </div>
        </div>
        <h1>{saudacao(agora)}</h1>
        <p class="saudacao-frase">{frase}</p>
      </header>

      {abrindoLink && (
        <p class="resultado" role="status">
          Abrindo o baralho do link…
        </p>
      )}

      {pendente && !plano && (
        <section class="recebido-pendente" aria-labelledby="recebido-pendente-titulo">
          <h2 id="recebido-pendente-titulo">Baralho recebido</h2>
          <p>
            <strong>{pendente.titulo}</strong> · {pendente.cartoes} {pendente.cartoes === 1 ? 'cartão' : 'cartões'}
          </p>
          <div class="recebido-pendente-acoes">
            <button class="btn principal" onClick={retomarPendente}>
              Ver o baralho
            </button>
            <button class="link" onClick={descartarPendente}>
              Descartar
            </button>
          </div>
        </section>
      )}

      {ofensiva.painel && !ofensiva.painel.hojeFeito && ativos.length > 0 && (
        <CartaoOfensiva
          painel={ofensiva.painel}
          agora={ofensiva.agora}
          estudar={() => {
            const id = ativos.some((b) => b.id === ofensiva.ultimoBaralho) ? ofensiva.ultimoBaralho! : ativos[0].id
            evento('ofensiva_estudar', { sequencia: ofensiva.painel?.sequencia ?? 0 })
            nav.ir({ nome: 'baralho', id })
          }}
        />
      )}

      <p class="secao-frase" id="secao-aprender">
        Aprenda uma coisa nova hoje.
      </p>
      <section class="bloco aprender" aria-labelledby="secao-aprender">
        <label class="campo">
          <span class="so-leitor">Aprender uma coisa nova hoje</span>
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

      <InstalarCard />

      {ativos.length > 0 && (
        <div class="secao-linha">
          <h2 class="secao-frase">Meus baralhos.</h2>
          {ativos.length >= 2 && (
            <div class="organizar">
              <button class="link" aria-pressed={!!organizando} onClick={alternarOrganizar}>
                {organizando ? 'Pronto' : 'Organizar'}
              </button>
            </div>
          )}
        </div>
      )}

      {organizando ? (
        <OrdenarBaralhos baralhos={organizando} mudar={mudarOrdem} />
      ) : (
        <ul class="lista-baralhos">
          {ativos.map((b, i) => {
            const cartoes = cartoesAtivos(b)
            const total = cartoes.length
            const dom = estados ? cartoes.filter((c) => dominado(estados.get(chave(b.id, c.id)))).length : 0
            const nunca = estados ? cartoes.filter((c) => !visto(estados.get(chave(b.id, c.id)))).length : 0
            return (
              <li>
                <button class="baralho-item cartao-acao" style={{ '--tom': TONS[i % TONS.length] }} onClick={() => nav.ir({ nome: 'baralho', id: b.id })}>
                  <span class="titulo">{b.titulo}</span>
                  <span class="detalhe">
                    {total} {total === 1 ? 'cartão' : 'cartões'}
                  </span>
                  <span class="barra" aria-hidden="true">
                    <span style={{ width: `${total ? (100 * dom) / total : 0}%` }} />
                  </span>
                  <span class="num">
                    {dom} de {total} dominados
                    {nunca > 0 && nunca < total && <> · {nunca} {nunca === 1 ? 'nunca visto' : 'nunca vistos'}</>}
                  </span>
                </button>
              </li>
            )
          })}
          {!baralhos.length && <p class="dica centro">Nenhum baralho ainda. Comece acima ou crie o primeiro abaixo.</p>}
        </ul>
      )}

      {arquivados.length > 0 && (
        <section class="arquivados">
          <button class="link" aria-expanded={verArquivados} onClick={() => setVerArquivados((v) => !v)}>
            Arquivados ({arquivados.length}) {verArquivados ? '▾' : '▸'}
          </button>
          {verArquivados && (
            <ul>
              {arquivados.map((b) => (
                <li>
                  <button class="link" onClick={() => nav.ir({ nome: 'baralho', id: b.id })}>
                    {b.titulo}
                  </button>
                  <span class="dica">
                    {b.cartoes.length} {b.cartoes.length === 1 ? 'cartão' : 'cartões'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section class="acoes">
        <button class="btn secundario" onClick={() => aprender('botao')}>
          Novo baralho
        </button>
        {semInternet === 'botao' && (
          <p class="resultado erro" role="alert">
            {SEM_INTERNET}
          </p>
        )}
      </section>

      <nav class="rodape" aria-label="Mais opções">
        <button class="btn terciario" onClick={() => abrirProgresso('rodape')}>
          Progresso
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'backup' })}>
          Backup
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'sincronizar', de: 'rodape' })}>
          Sincronizar
        </button>
        <button class="btn terciario" onClick={() => nav.ir({ nome: 'aparencia' })}>
          Preferências
        </button>
      </nav>
      <p class="versao">{sync.estado ? 'Funciona sem internet · sincronizado com seus outros aparelhos' : 'Funciona sem internet · seus cartões ficam neste aparelho'}</p>
      {aviso && <AvisoRecebido titulo={aviso.titulo} texto={aviso.texto} fechar={() => setAviso(null)} />}
      {plano && <Importar plano={plano} nav={nav} fechar={fecharImportar} adiar={textoRecebido ? adiarImportar : undefined} />}
      {compartilhar && (
        <CompartilharImagem
          opcoes={compartilhar.opcoes}
          onde={compartilhar.onde}
          avisar={(texto) => nav.avisar({ texto })}
          fechar={() => setCompartilhar(null)}
          extra={
            compartilhar.onde === 'semana' ? (
              <button class="btn secundario" onClick={() => { setCompartilhar(null); abrirProgresso('semana') }}>
                Meu progresso
              </button>
            ) : undefined
          }
        />
      )}
      {cartoesRecebidos && <ImportarCartoes recebido={cartoesRecebidos} baralhos={baralhos} nav={nav} fechar={() => setCartoesRecebidos(null)} />}
    </main>
  )
}
