import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { confere, formatar, lerNumero, preencher, sortear, type Sorteio } from '../core/calc'
import { embaralhar } from '../core/aleatorio'
import { ativos, arquivarCartao, desarquivarCartao } from '../core/cartoes'
import { db, type Nota } from '../core/db'
import { filaEspacada, filaProva, posicaoReinsercao, type OpcoesFila } from '../core/fila'
import { formaDaCerta, sortearAlternativas } from '../core/alternativas'
import { chave, registrar, semAlternativas } from '../core/srs'
import { origemBaralho } from '../core/metricas'
import { evento, registrarErro } from '../core/telemetria'
import { temaComPoucosCartoes } from '../core/sugestao'
import { formasAceitas, NIVEIS_COM_ALTERNATIVAS, partesDaFrente } from '../core/lacunas'
import type { Baralho, Cartao, CartaoAssociacao, CartaoCalculo, CartaoLacunas, Objetivo } from '../core/types'
import { LAYOUTS_FIM, pecaFimSessao } from '../core/artes'
import { fecharSessao, type Marco } from '../core/conquistas'
import { concluirSessao, type Conclusao } from '../core/ofensiva'
import { Cronometro, fotografarDominio, gravarSessao } from '../core/sessoes'
import { CompartilharImagem, urlApp, type OpcaoImagem } from './CompartilharImagem'
import { Confete } from './Confete'
import { Pavao } from './Leque'
import { DesafiarModal } from './Desafio'
import { podeDesafiar } from '../core/artes'
import { nomeTema } from './estado'
import { CorrigirCartao } from './CorrigirCartao'
import { EditarCartao } from './EditarCartao'
import { conteudoCartao } from './enviar'
import { EnviarModal } from './EnviarModal'
import { Folha } from './Folha'
import { Icone } from './Icone'
import { DesenhoOfensiva } from './Marca'
import { Tex } from './Tex'
import type { Aviso } from './App'

export type Modo = 'prova' | 'espacada' | 'calculo'
/** Até onde vai a sessão: N cartões, X minutos ou livre (até a pessoa tocar em Terminar). */
export type Limite = { tipo: 'acertos'; n: number } | { tipo: 'tempo'; minutos: number } | { tipo: 'livre' }

const TODOS = 10000 // com limite: a fila tem todos os cartões; o relógio, a meta ou o Terminar decidem o fim

/** No modo livre, Terminar só conclui a sessão (vale o dia da ofensiva) com pelo menos estas respostas. */
export const MINIMO_LIVRE = 5
export const podeTerminar = (respondidos: number) => respondidos >= MINIMO_LIVRE

const relogio = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const TITULO: Record<Modo, string> = { prova: 'Estudar', espacada: 'Estudar', calculo: 'Cálculo' }

/** Ações que o cartão pode usar dentro da folha de resultado. */
export interface Acoes {
  /** `chute`: acertou chutando — registra como difícil, mas não conta como acerto. */
  avaliar: (n: Nota, chute?: boolean) => void
  /** Sem ela (no desafio recebido), o botão "Corrigir" não aparece. */
  corrigir?: () => void
}

function BotaoCorrigir({ acoes }: { acoes: Acoes }) {
  if (!acoes.corrigir) return null
  return (
    <button class="btn terciario compacto" onClick={acoes.corrigir}>
      Cartão errado? Corrigir
    </button>
  )
}

export function Sessao({ baralho: inicial, modo, opcoes, limite, sair, criarMais, mudou, avisar }: { baralho: Baralho; modo: Modo; opcoes: OpcoesFila; limite?: Limite; sair: () => void; criarMais: (assunto?: string, temaId?: string) => void; mudou?: () => void; avisar?: (a: Aviso) => void }) {
  // Cópia local: correções feitas durante a sessão entram aqui sem reiniciar a sessão.
  const [baralho, setBaralho] = useState(inicial)
  const [corrigindo, setCorrigindo] = useState(false)
  // Correção manual: o editor ocupa a tela, mas a sessão fica montada por baixo.
  // Ganha uma entrada no histórico para o "voltar" do Android fechar o editor, não a sessão.
  const [editando, setEditando] = useState(false)
  useEffect(() => {
    if (!editando) return
    const aoVoltar = () => setEditando(false)
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [editando])
  const abrirEditor = () => {
    evento('corrigir_manual_aberto', { onde: 'estudo' })
    history.pushState({ n: history.state?.n ?? 0 }, '')
    setCorrigindo(false)
    setEditando(true)
    window.scrollTo(0, 0)
  }
  const fecharEditor = () => history.back()
  const [enviando, setEnviando] = useState<Cartao | null>(null)
  const [desafiando, setDesafiando] = useState<Cartao | null>(null)
  // Erros e chutes por tema, para sugerir onde criar mais cartões no fim.
  const [fracos, setFracos] = useState<Record<string, number>>({})
  // Primeira sessão do baralho (nenhum cartão estudado antes): no fim, sugere o tema com poucos cartões.
  const [primeira, setPrimeira] = useState(false)
  const [fila, setFila] = useState<Cartao[] | null>(null)
  // Cartões de alternativas com 2 acertos seguidos no início da sessão: aparecem sem alternativas.
  const [semAlt, setSemAlt] = useState<Set<string>>(new Set())
  // Cartões do baralho nunca vistos no início da sessão e os respondidos nela: no fim, diz quantos faltam.
  const [naoVistos, setNaoVistos] = useState<Set<string>>(new Set())
  const [respondidosIds, setRespondidosIds] = useState<Set<string>>(new Set())
  const [pos, setPos] = useState(0)
  // Posição atual para o "Desfazer" do arquivar, que roda depois de a sessão ter andado.
  const posAtual = useRef(0)
  posAtual.current = pos
  const [placar, setPlacar] = useState({ certos: 0, errados: 0, chutes: 0, pulados: 0 })
  const [rodada, setRodada] = useState(0)
  const [vez, setVez] = useState(0) // força remontar o cartão ao pular
  const porTempo = limite?.tipo === 'tempo'
  const totalMs = porTempo ? limite.minutos * 60000 : 0
  const [fimEm, setFimEm] = useState(0)
  const [agora, setAgora] = useState(Date.now())
  const restante = porTempo && fimEm ? Math.max(0, fimEm - agora) : totalMs
  const esgotou = porTempo && fimEm > 0 && restante === 0
  const meta = limite?.tipo === 'acertos' ? limite.n : 0
  const livre = limite?.tipo === 'livre'
  // Livre: a pessoa tocou em Terminar com respostas suficientes; a sessão vai para o fim.
  const [terminou, setTerminou] = useState(false)
  // Livre: tocou em Terminar com poucas respostas; pergunta se quer sair sem concluir.
  const [avisoSair, setAvisoSair] = useState(false)

  // Tempo de estudo da sessão (painel Seu progresso): só com a tela visível; grava uma vez, no fim ou ao sair.
  const estudo = useRef<{ relogio: Cronometro; inicio: number; gravada: boolean } | null>(null)
  const placarRef = useRef(placar)
  placarRef.current = placar
  const fecharEstudo = (concluida: boolean, bateu: boolean) => {
    const e = estudo.current
    if (!e || e.gravada) return
    e.gravada = true
    const agoraMs = Date.now()
    e.relogio.pausar(agoraMs)
    const p = placarRef.current
    const respostas = p.certos + p.errados + p.chutes
    if (!respostas) return
    evento('sessao_fim', {
      concluida,
      por: porTempo ? 'tempo' : livre ? 'livre' : 'acertos',
      meta: porTempo ? limite.minutos : meta,
      bateu_meta: bateu,
      segundos: Math.round(e.relogio.ativoMs / 1000),
      respostas,
      acertos: p.certos,
      origem_baralho: origemBaralho(baralho),
    })
    gravarSessao({
      baralho: baralho.id,
      inicio: e.inicio,
      fim: agoraMs,
      ativoMs: e.relogio.ativoMs,
      respostas,
      acertos: p.certos,
      por: porTempo ? 'tempo' : livre ? 'livre' : 'acertos',
      meta: porTempo ? limite.minutos : meta || undefined,
      bateuMeta: bateu,
      concluida,
    })
      .then(() => fotografarDominio(baralho, agoraMs))
      .catch((x) => {
        registrarErro('sessao_gravar', x)
        console.error('Não foi possível gravar a sessão', x)
      })
  }
  const fecharEstudoRef = useRef(fecharEstudo)
  fecharEstudoRef.current = fecharEstudo
  useEffect(() => {
    const aoMudar = () => {
      const r = estudo.current?.relogio
      if (!r) return
      if (document.visibilityState === 'hidden') r.pausar(Date.now())
      else r.retomar(Date.now())
    }
    const aoFechar = () => fecharEstudoRef.current(false, false)
    document.addEventListener('visibilitychange', aoMudar)
    window.addEventListener('pagehide', aoFechar)
    return () => {
      document.removeEventListener('visibilitychange', aoMudar)
      window.removeEventListener('pagehide', aoFechar)
      // Saiu pelo ← (ou pelo voltar do aparelho): grava o que estudou, sem concluir.
      fecharEstudoRef.current(false, false)
    }
  }, [])
  const acabou = !!fila && fila.length > 0 && ((meta > 0 && placar.certos >= meta) || esgotou || terminou || pos >= fila.length)
  useEffect(() => {
    if (acabou) fecharEstudo(true, (meta > 0 && placar.certos >= meta) || !!esgotou)
  }, [acabou])

  // Relógio da sessão por tempo: atualiza a cada segundo até acabar.
  useEffect(() => {
    if (!porTempo || !fimEm || esgotou) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [porTempo, fimEm, esgotou])

  useEffect(() => {
    Promise.all([db.estados.toArray(), db.revisoes.where('cartao').startsWith(`${baralho.id}/`).toArray()]).then(([l, revisoes]) => {
      const m = new Map(l.map((e) => [e.id, e]))
      if (rodada === 0) setPrimeira(!baralho.cartoes.some((c) => m.has(chave(baralho.id, c.id))))
      // Por tempo ou por acertos, a fila tem todos os cartões; o relógio ou a meta decidem o fim.
      const tamanho = limite ? TODOS : modo === 'calculo' ? 10 : 20
      const f = modo === 'espacada' ? filaEspacada(baralho, m, { ...opcoes, tamanho }, porTempo ? 100 : Math.min(tamanho, 15)) : filaProva(baralho, m, { ...opcoes, tamanho })
      setFila(f)
      const sem = semAlternativas(revisoes)
      setSemAlt(new Set(baralho.cartoes.filter((c) => sem.has(chave(baralho.id, c.id))).map((c) => c.id)))
      setNaoVistos(new Set(ativos(baralho).filter((c) => !m.has(chave(baralho.id, c.id))).map((c) => c.id)))
      setRespondidosIds(new Set())
      setPos(0)
      setPlacar({ certos: 0, errados: 0, chutes: 0, pulados: 0 })
      setFracos({})
      setTerminou(false)
      estudo.current = { relogio: new Cronometro(Date.now()), inicio: Date.now(), gravada: false }
      if (porTempo) {
        setAgora(Date.now())
        setFimEm(Date.now() + totalMs)
      }
    })
  }, [rodada])

  if (!fila) return <main class="tela"><p>Carregando…</p></main>
  const fracoId = temaFracoId(fracos)
  // Só em baralho com objetivo (criado pelo fluxo "Aprender"), para não mudar o fim da sessão dos antigos.
  const poucos = primeira && baralho.objetivo ? temaComPoucosCartoes(baralho) : undefined

  const bateuMeta = meta > 0 && placar.certos >= meta
  const cartao = esgotou || bateuMeta || terminou ? undefined : fila[pos]
  const respondidos = placar.certos + placar.errados + placar.chutes
  const avaliar = async (nota: Nota, chute = false) => {
    if (!cartao) return
    try {
      await registrar(chave(baralho.id, cartao.id), nota, modo)
    } catch (e) {
      console.error('Não foi possível salvar o progresso', e) // a sessão continua mesmo assim
    }
    estudo.current?.relogio.tocar(Date.now())
    evento('resposta', { tipo: cartao.tipo, nota, chute, sem_alternativas: semAlt.has(cartao.id) })
    setRespondidosIds((r) => new Set(r).add(cartao.id))
    setPlacar((p) => (nota === 1 ? { ...p, errados: p.errados + 1 } : chute ? { ...p, chutes: p.chutes + 1 } : { ...p, certos: p.certos + 1 }))
    if (nota === 1 || chute) {
      setFracos((f) => ({ ...f, [cartao.tema]: (f[cartao.tema] ?? 0) + 1 }))
      // Errou ou chutou: o cartão volta daqui a alguns cartões nesta mesma sessão.
      const nova = [...fila]
      nova.splice(posicaoReinsercao(pos, nova.length), 0, cartao)
      setFila(nova)
    }
    setPos(pos + 1)
    window.scrollTo(0, 0)
  }

  /** Pular: não registra nada; o cartão vai para o fim da sessão (se for o último, a sessão termina). */
  const pular = () => {
    estudo.current?.relogio.tocar(Date.now())
    evento('cartao_pulado', { tipo: fila[pos]?.tipo })
    setPlacar((p) => ({ ...p, pulados: p.pulados + 1 }))
    if (pos < fila.length - 1) {
      const nova = [...fila]
      nova.push(nova.splice(pos, 1)[0])
      setFila(nova)
      setVez((v) => v + 1)
    } else setPos(pos + 1)
    window.scrollTo(0, 0)
  }

  const acoes: Acoes = { avaliar, corrigir: () => { evento('corrigir_aberto', { onde: 'estudo' }); setCorrigindo(true) } }
  const sairDaSessao = () => {
    if (cartao) evento('sessao_abandonada', { respondidos, por: porTempo ? 'tempo' : livre ? 'livre' : 'acertos' })
    sair()
  }
  /** Livre: com respostas suficientes vai para o fim (conta como concluída); com menos, avisa e sai como o ←. */
  const terminar = () => {
    if (podeTerminar(respondidos)) {
      evento('sessao_terminada', { respondidos })
      setTerminou(true)
    } else setAvisoSair(true)
  }
  const falta = MINIMO_LIVRE - respondidos

  /** Arquivar: o cartão sai desta sessão e das próximas, sem apagar nada; o aviso permite desfazer. */
  const arquivar = async () => {
    if (!cartao) return
    const c = cartao
    const b = await arquivarCartao(baralho, c.id)
    setBaralho(b)
    mudou?.()
    evento('cartao_arquivado', { onde: 'estudo', tipo: c.tipo })
    // Sai da posição atual e das vezes que ia voltar (errado ou pulado); as já respondidas ficam.
    setFila(fila.filter((x, i) => i < pos || x.id !== c.id))
    setNaoVistos((n) => {
      const s = new Set(n)
      s.delete(c.id)
      return s
    })
    setVez((v) => v + 1)
    window.scrollTo(0, 0)
    avisar?.({
      texto: 'Cartão arquivado. Ele não volta mais no estudo.',
      desfazer: async () => {
        setBaralho(await desarquivarCartao(b, c.id))
        mudou?.()
        evento('cartao_desarquivado', { onde: 'estudo' })
        setFila((f) => (f ? [...f.slice(0, posAtual.current), c, ...f.slice(posAtual.current)] : f))
      },
    })
  }

  /** Cartão corrigido: troca na sessão e mostra de novo, para responder já com o conteúdo certo. */
  const corrigido = (c: Cartao, b: Baralho) => {
    setBaralho(b)
    // Recarrega a lista do App: senão "Criar mais" e as outras telas abrem com o cartão antigo.
    mudou?.()
    setFila(fila.map((x) => (x.id === c.id ? c : x)))
    setVez((v) => v + 1)
    setCorrigindo(false)
  }

  if (editando && cartao)
    return (
      <EditarCartao
        baralho={baralho}
        cartaoId={cartao.id}
        naSessao={{
          aoSalvar: (c, b) => {
            corrigido(c, b)
            fecharEditor()
          },
          fechar: fecharEditor,
        }}
      />
    )

  return (
    <main class="tela sessao">
      <header class={`barra-sessao ${livre ? 'livre' : ''}`}>
        <button class="fechar" aria-label="Sair da sessão" onClick={sairDaSessao}>
          ←
        </button>
        <span class="titulo-barra">{TITULO[modo]}</span>
        <span class="contador" aria-live="off">
          {!cartao ? '' : porTempo ? relogio(restante) : meta ? `✓ ${placar.certos}/${meta}` : livre ? `✓ ${placar.certos}` : `${pos + 1} de ${fila.length}`}
        </span>
        {livre && cartao && (
          <button class="btn terciario compacto terminar" onClick={terminar}>
            Terminar
          </button>
        )}
      </header>
      {avisoSair && (
        <>
          <div class="folha-fundo" aria-hidden="true" onClick={() => setAvisoSair(false)} />
          <div class="folha" role="dialog" aria-modal="true" aria-labelledby="titulo-sair-livre">
            <span class="folha-alca" aria-hidden="true">
              <span />
            </span>
            <h2 id="titulo-sair-livre" class="folha-titulo">
              Sair sem concluir?
            </h2>
            <div class="folha-corpo">
              <p>
                Faltam {falta} {falta === 1 ? 'resposta' : 'respostas'} para a sessão valer o dia. O que você já respondeu fica salvo.
              </p>
            </div>
            <div class="folha-acoes">
              <button class="btn principal" onClick={() => setAvisoSair(false)}>
                Continuar estudando
              </button>
              <button class="btn terciario" onClick={sairDaSessao}>
                Sair mesmo assim
              </button>
            </div>
          </div>
        </>
      )}
      {porTempo && cartao && (
        <div class="fio-tempo" role="timer" aria-label={`Tempo restante: ${relogio(restante)}`}>
          <div style={{ width: `${(100 * restante) / totalMs}%` }} />
        </div>
      )}
      {meta > 0 && cartao && (
        <div class="fio-tempo" role="progressbar" aria-label={`${placar.certos} de ${meta} acertos`} aria-valuemin={0} aria-valuemax={meta} aria-valuenow={placar.certos}>
          <div style={{ width: `${(100 * placar.certos) / meta}%` }} />
        </div>
      )}
      {!porTempo && !meta && !livre && fila.length > 0 && (
        <div class="progresso" role="progressbar" aria-label="Progresso da sessão" aria-valuemin={0} aria-valuemax={fila.length} aria-valuenow={pos}>
          <div style={{ width: `${(100 * pos) / fila.length}%` }} />
        </div>
      )}

      {!cartao ? (
        <Fim
          fimMotivo={fila.length === 0 ? 'vazia' : bateuMeta ? 'meta' : esgotou ? 'tempo' : terminou ? 'terminou' : 'fila'}
          placar={placar}
          vazio={fila.length === 0}
          modo={modo}
          tempo={porTempo ? (esgotou ? 'esgotado' : relogio(totalMs - restante)) : undefined}
          bateuMeta={bateuMeta}
          outra={() => setRodada((r) => r + 1)}
          sair={sair}
          temaFraco={fracoId ? nomeTema(baralho, fracoId) : undefined}
          temaId={fracoId}
          temaPoucos={poucos}
          objetivo={baralho.objetivo}
          criarMais={criarMais}
          baralho={baralho}
          soNovos={!!opcoes.soNovos}
          nuncaVistos={{ antes: naoVistos.size, faltam: [...naoVistos].filter((c) => !respondidosIds.has(c)).length }}
        />
      ) : (
        <>
          <div class="meta-cartao">
            <span class="tema-chip">{nomeTema(baralho, cartao.tema)}</span>
            <button class="icone-btn" aria-label="Enviar este cartão" title="Enviar este cartão" onClick={() => setEnviando(cartao)}>
              <Icone nome="enviar" />
            </button>
          </div>
          <CartaoView key={`${pos}-${vez}-${cartao.id}`} cartao={cartao} acoes={acoes} semAlternativas={semAlt.has(cartao.id)} facil={!!baralho.objetivo?.nivel && (NIVEIS_COM_ALTERNATIVAS as readonly string[]).includes(baralho.objetivo.nivel)} distratores={respostasDoBaralho(baralho)} />
          <div class="acoes-cartao">
            <button class="btn terciario" onClick={pular}>
              Pular
            </button>
            <button class="btn terciario" onClick={() => setCorrigindo(true)}>
              Corrigir
            </button>
            <button class="btn terciario" onClick={arquivar}>
              Arquivar
            </button>
          </div>
          {corrigindo && <CorrigirCartao baralho={baralho} cartao={cartao} aoSalvar={corrigido} fechar={() => setCorrigindo(false)} corrigirEuMesmo={abrirEditor} />}
          {enviando && <EnviarModal conteudo={conteudoCartao(baralho, enviando)} onde="estudo" fechar={() => setEnviando(null)} desafiar={podeDesafiar(enviando) ? () => { setDesafiando(enviando); setEnviando(null) } : undefined} />}
          {desafiando && <DesafiarModal baralho={baralho} cartao={desafiando} fechar={() => setDesafiando(null)} />}
        </>
      )}
    </main>
  )
}

/** Id do tema com mais erros e chutes na sessão (ou nada, se não houve). */
function temaFracoId(fracos: Record<string, number>): string | undefined {
  const [id] = Object.entries(fracos).sort((a, z) => z[1] - a[1])[0] ?? []
  return id
}

function Fim(props: {
  fimMotivo: string
  placar: { certos: number; errados: number; chutes: number; pulados: number }
  vazio: boolean
  modo: Modo
  tempo?: string
  bateuMeta?: boolean
  temaFraco?: string
  /** Tema com poucos cartões, sugerido depois da primeira sessão de um baralho novo (tem prioridade). */
  temaPoucos?: { id: string; nome: string }
  temaId?: string
  objetivo?: Objetivo
  baralho: Baralho
  outra: () => void
  sair: () => void
  criarMais: (assunto?: string, temaId?: string) => void
  /** Nunca vistos no baralho antes da sessão e os que ainda faltam depois dela. */
  nuncaVistos?: { antes: number; faltam: number }
  soNovos?: boolean
}) {
  const { placar, vazio, modo, tempo, bateuMeta, temaFraco, temaPoucos, objetivo, outra, sair, criarMais, baralho } = props
  const temaId = temaPoucos?.id ?? props.temaId
  const tema = temaPoucos?.nome ?? temaFraco
  // Sem tema sugerido: se há foco no objetivo, a IA aprofunda nele; senão, o assunto fica em branco.
  const assuntoSugerido = tema ?? (objetivo?.foco?.length ? `Aprofundar: ${objetivo.foco.join(', ')}` : undefined)
  useEffect(() => evento('sessao_concluida', { motivo: props.fimMotivo, ...placar }), [])
  const total = placar.certos + placar.errados + placar.chutes
  const pct = total ? Math.round((100 * placar.certos) / total) : 0
  // Sequência de dias e marco novo (cada marco comemora uma vez só).
  const [conquista, setConquista] = useState<{ sequencia: number; marco?: Marco } | null>(null)
  // Ofensiva: a sessão concluída garante o dia (antes das conquistas, que usam a mesma sequência).
  const [ofensiva, setOfensiva] = useState<Conclusao | null>(null)
  const [compartilhando, setCompartilhando] = useState(false)
  useEffect(() => {
    if (vazio || !total) return
    concluirSessao()
      .then((r) => {
        setOfensiva(r)
        if (r.primeiraHoje) evento('ofensiva_dia', { sequencia: r.sequencia })
        if (r.usadas) evento('folga_usada', { n: r.usadas })
        if (r.folgaGanha) evento('folga_ganha', { motivo: 'semana' })
      })
      .catch(() => undefined)
      .then(() => fecharSessao([baralho], !!bateuMeta))
      .then((r) => {
        setConquista(r)
        if (r.marco) evento('marco', { tipo: r.marco.tipo })
      })
      .catch(() => setConquista({ sequencia: 0 }))
  }, [])
  const motivo = conquista?.marco ? 'marco' : bateuMeta ? 'meta' : total >= 10 && pct >= 80 ? 'acerto' : ''
  useEffect(() => {
    if (!motivo) return
    evento('comemoracao', { motivo })
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(30)
  }, [motivo])

  if (vazio)
    return (
      <section class="fim">
        <span class="icone-fim"><Icone nome="avancar" tamanho={48} /></span>
        <p>{modo === 'espacada' ? 'Nada para revisar agora.' : props.soNovos ? '✓ Você já passou por todos os cartões desses temas.' : 'Nenhum cartão nesses temas.'}</p>
        <button class="btn principal" onClick={sair}>Voltar ao início</button>
      </section>
    )
  const sequencia = conquista?.sequencia ?? 0
  const marco = conquista?.marco
  // Três layouts no visual claro da tela (a usuária mandou a tela como referência).
  const opcoesImagem: OpcaoImagem[] = LAYOUTS_FIM.map(({ layout, rotulo }) => ({
    rotulo,
    usaNome: true,
    peca: (comNome) =>
      pecaFimSessao({ ...placar, baralho: baralho.titulo, comNome, bateuMeta, tempo: tempo && tempo !== 'esgotado' ? tempo : undefined, sequencia: ofensiva?.sequencia ?? sequencia, urlApp: urlApp(), marco }, layout),
  }))
  return (
    <section class={`fim ${motivo ? 'comemorando' : ''}`}>
      {motivo && <Confete />}
      {motivo ? <Pavao /> : <span class="icone-fim"><Icone nome="avancar" tamanho={48} /></span>}
      <h2>{bateuMeta ? 'Meta atingida!' : motivo === 'acerto' ? 'Mandou bem!' : tempo === 'esgotado' ? 'Tempo esgotado' : 'Sessão concluída'}</h2>
      <p>
        {placar.certos} {placar.certos === 1 ? 'acerto' : 'acertos'}, {placar.errados} {placar.errados === 1 ? 'erro' : 'erros'}
        {placar.chutes > 0 && <> e {placar.chutes} {placar.chutes === 1 ? 'chute' : 'chutes'}</>} em {total} {total === 1 ? 'resposta' : 'respostas'}
        {placar.pulados > 0 && <>; {placar.pulados} {placar.pulados === 1 ? 'pulo' : 'pulos'}</>}.
      </p>
      {total > 0 && <p class="placar-final">{Math.round((100 * placar.certos) / total)}% de acerto</p>}
      {tempo && tempo !== 'esgotado' && <p class="dica">Terminou os cartões em {tempo}.</p>}
      {props.nuncaVistos && props.nuncaVistos.antes > 0 && (
        <p class="dica vistos" role="status">
          {props.nuncaVistos.faltam === 0
            ? '✓ Agora você já passou por todos os cartões deste baralho.'
            : `Faltam ${props.nuncaVistos.faltam} ${props.nuncaVistos.faltam === 1 ? 'cartão que você nunca viu' : 'cartões que você nunca viu'} neste baralho.`}
        </p>
      )}
      {ofensiva?.primeiraHoje ? (
        <p class="ofensiva-fim" role="status">
          <strong><DesenhoOfensiva dias={ofensiva.sequencia} aceso tamanho={28} /> {ofensiva.sequencia} {ofensiva.sequencia === 1 ? 'dia' : 'dias'}</strong>
          <span>{ofensiva.sequencia === 1 ? 'Ofensiva começada. Volte amanhã para crescer.' : 'Hoje garantido.'}</span>
        </p>
      ) : (
        sequencia >= 2 && <p class="sequencia"><DesenhoOfensiva dias={sequencia} aceso tamanho={18} /> {sequencia} dias seguidos</p>
      )}
      {ofensiva?.folgaGanha && <p class="aviso-folga">+1 folga guardada por {ofensiva.sequencia} dias seguidos</p>}
      {marco && (
        <section class="conquista" role="status">
          <span class="selo-conquista">Conquista!</span>
          <strong class="destaque">{marco.destaque}</strong>
          <span>{marco.legenda}</span>
        </section>
      )}
      {total > 0 && (
        <button class="btn secundario" onClick={() => setCompartilhando(true)}>
          <span class="com-icone"><Icone nome="enviar" /> Compartilhar {marco ? 'conquista' : 'resultado'}</span>
        </button>
      )}
      <p class="dica">Os cartões errados voltam primeiro na próxima rodada.</p>
      <section class="incentivo-ia">
        <Icone nome="entender" />
        <div>
          <strong>Que tal mais cartões?</strong>
          <p>
            {temaPoucos
              ? `Seu baralho ainda tem poucos cartões sobre “${temaPoucos.nome}”. A IA cria mais cartões sobre esse tema em poucos minutos.`
              : temaFraco
              ? `Você teve mais dificuldade em “${temaFraco}”. A IA cria cartões novos sobre esse tema em poucos minutos.`
              : objetivo?.resumo
                ? `Quer avançar em ${objetivo.resumo}? A IA cria mais cartões em poucos minutos.`
                : 'Variar as perguntas ajuda a fixar. Use outra aula ou um resumo para a IA criar cartões novos.'}
          </p>
        </div>
        <button class="btn secundario" onClick={() => { evento('sugestao_mais_cartoes', { motivo: temaPoucos ? 'poucos' : temaFraco ? 'fraco' : 'objetivo' }); criarMais(assuntoSugerido, temaId) }}>
          {tema ? `Criar cartões sobre ${tema}` : 'Criar mais cartões com IA'}
        </button>
      </section>
      <button class="btn principal" onClick={outra}>
        <span class="com-icone"><Icone nome="praticar" /> Mais uma rodada</span>
      </button>
      <button class="btn secundario" onClick={sair}>Voltar ao início</button>
      {compartilhando && <CompartilharImagem opcoes={opcoesImagem} onde="fim_sessao" fechar={() => setCompartilhando(false)} />}
    </section>
  )
}


function Explicacao({ texto }: { texto: string }) {
  return (
    <div class="explicacao">
      <span class="rotulo-icone">
        <Icone nome="entender" tamanho={20} /> Explicação
      </span>
      <Tex texto={texto} />
    </div>
  )
}

function Fonte({ c }: { c: Cartao }) {
  if (!c.fonte) return null
  return (
    <p class="fonte">
      Fonte: {c.fonte.apostila}
      {c.fonte.pagina !== undefined && `, p. ${c.fonte.pagina}`}
    </p>
  )
}

/**
 * Como foi a resposta. Pergunta e resposta: Acertei, Acertei no chute ou Errei ("Não sei" fica antes de revelar).
 * Alternativas, V/F e cálculo já sabem se acertou: se acertou, Continuar ou Foi no chute; se errou, só Continuar.
 * Notas do agendamento: acertou = 3, no chute = 2 (não conta acerto), não sabia/errei = 1.
 * A nota 2 sem chute ("com dificuldade") saiu da tela; o histórico ainda tem notas 2.
 */
function BotoesNota({ avaliar, acertou }: { avaliar: (n: Nota, chute?: boolean) => void; acertou?: boolean }) {
  if (acertou === false)
    return (
      <div class="notas">
        <button class="btn nota n1" onClick={() => avaliar(1)}>
          Continuar
          <small>este cartão volta daqui a pouco</small>
        </button>
      </div>
    )
  if (acertou)
    return (
      <div class="notas duas" role="group" aria-label="Como foi?">
        <button class="btn nota n4" onClick={() => avaliar(3)}>
          Continuar
        </button>
        <button class="btn nota n2" onClick={() => avaliar(2, true)}>
          Foi no chute
        </button>
      </div>
    )
  return (
    <div class="notas tres" role="group" aria-label="Como foi?">
      <button class="btn nota n4" onClick={() => avaliar(3)}>
        Acertei
      </button>
      <button class="btn nota n2" onClick={() => avaliar(2, true)}>
        Acertei no chute
      </button>
      <button class="btn nota n1" onClick={() => avaliar(1)}>
        Errei
      </button>
    </div>
  )
}

/** "Não sei": mostra a resposta e conta como erro. Fica fora da resposta, antes de revelar. */
function BotaoNaoSei({ tipo, aoTocar }: { tipo: Cartao['tipo']; aoTocar: () => void }) {
  return (
    <button class="btn terciario nao-sei" onClick={() => { evento('nao_sei', { tipo }); aoTocar() }}>
      Não sei
    </button>
  )
}

/** Respostas de outras lacunas do baralho: alternativas erradas plausíveis no nível fácil. */
export function respostasDoBaralho(b: Baralho): string[] {
  return b.cartoes.flatMap((c) => (c.tipo === 'lacunas' ? c.respostas.map((r) => formasAceitas(r)[0]) : []))
}

export function CartaoView({ cartao, acoes, semAlternativas, facil, distratores }: { cartao: Cartao; acoes: Acoes; semAlternativas?: boolean; facil?: boolean; distratores?: string[] }) {
  switch (cartao.tipo) {
    case 'conceito':
      return <Conceito c={cartao} acoes={acoes} />
    case 'vf':
      return <Escolha c={cartao} pergunta={cartao.frente} opcoes={['Verdadeiro', 'Falso']} correta={cartao.resposta ? 0 : 1} acoes={acoes} rotulo="Verdadeiro ou falso" />
    case 'associacao':
      return <Associacao c={cartao} acoes={acoes} semAlternativas={semAlternativas} />
    case 'calculo':
      return <Calculo c={cartao} acoes={acoes} />
    case 'lacunas':
      return <Lacunas c={cartao} acoes={acoes} facil={facil} distratores={distratores ?? []} />
  }
}

/**
 * Frase com lacunas. Nível fácil: uma lista de alternativas por lacuna. Nível difícil: só revelar a frase.
 */
function Lacunas({ c, acoes, facil, distratores }: { c: CartaoLacunas; acoes: Acoes; facil?: boolean; distratores: string[] }) {
  const partes = partesDaFrente(c.frente)
  const certas = c.respostas.map((r) => formasAceitas(r)[0] ?? '')
  const opcoesPorLacuna = useMemo(
    () =>
      certas.map((certa, i) => {
        const outras = embaralhar([...new Set(distratores.filter((d) => d && d !== certa))]).slice(0, 3)
        return { certa, opcoes: embaralhar([certa, ...outras]), i }
      }),
    [c.id],
  )
  const [virado, setVirado] = useState(false)
  const [escolhas, setEscolhas] = useState<(string | null)[]>(certas.map(() => null))
  const usaAlternativas = !!facil && distratores.length > 0
  // "Não sei": mostra a frase completa e conta como erro, como nas alternativas.
  const [naoSabia, setNaoSabia] = useState(false)
  const respondeu = usaAlternativas && (naoSabia || escolhas.every((e) => e !== null))
  const acertou = respondeu && !naoSabia && escolhas.every((e, i) => formasAceitas(c.respostas[i]).includes(e!))
  const fraseComRespostas = (
    <Tex class="frente" texto={partes.reduce((acc, p, i) => acc + p + (i < certas.length ? `**${certas[i]}**` : ''), '')} />
  )
  const mostrar = () => setVirado(true)
  const lacunas = (
    <p class="frente lacunas">
      {partes.map((p, i) => (
        <>
          <Tex texto={p} />
          {i < certas.length && <span class="lacuna">{escolhas[i] ?? '____'}</span>}
        </>
      ))}
    </p>
  )
  if (!usaAlternativas)
    return (
      <article class="cartao">
        <p class="rotulo">Complete a lacuna</p>
        {lacunas}
        {!virado && (
          <>
            <button class="btn principal virar" onClick={mostrar}>
              Mostrar resposta
            </button>
            <BotaoNaoSei tipo={c.tipo} aoTocar={() => { setNaoSabia(true); mostrar() }} />
          </>
        )}
        {virado && (
          <Folha
            titulo={naoSabia ? 'Tudo bem, veja a resposta' : 'Resposta'}
            tom={naoSabia ? 'neutro' : undefined}
            rodape={naoSabia ? <BotoesNota avaliar={acoes.avaliar} acertou={false} /> : <><p class="dica centro">Como foi?</p><BotoesNota avaliar={acoes.avaliar} /></>}
          >
            {fraseComRespostas}
            {c.explicacao && <Explicacao texto={c.explicacao} />}
            <Fonte c={c} />
            <BotaoCorrigir acoes={acoes} />
          </Folha>
        )}
      </article>
    )
  return (
    <article class="cartao">
      <p class="rotulo">Escolha a palavra que completa</p>
      {lacunas}
      {!respondeu && (() => {
        // Uma lacuna por vez, na ordem.
        const l = opcoesPorLacuna[escolhas.indexOf(null)]
        return (
          <>
            {certas.length > 1 && <p class="dica">Lacuna {l.i + 1} de {certas.length}</p>}
            <div class="opcoes">
              {l.opcoes.map((o) => (
                <button key={o} class="opcao" onClick={() => setEscolhas(escolhas.map((e, k) => (k === l.i ? o : e)))}>
                  <Tex texto={o} />
                </button>
              ))}
            </div>
            <BotaoNaoSei tipo={c.tipo} aoTocar={() => setNaoSabia(true)} />
          </>
        )
      })()}
      {respondeu && (
        <Folha
          titulo={acertou ? '✓ Certo!' : naoSabia ? 'Tudo bem, veja a resposta' : '✕ Não foi dessa vez'}
          tom={acertou ? 'ok' : naoSabia ? 'neutro' : 'erro'}
          rodape={<BotoesNota avaliar={acoes.avaliar} acertou={acertou} />}
        >
          {fraseComRespostas}
          {c.explicacao && <Explicacao texto={c.explicacao} />}
          <Fonte c={c} />
          <BotaoCorrigir acoes={acoes} />
        </Folha>
      )}
    </article>
  )
}

/**
 * Alternativas: a cada vez, uma forma da certa e 3 erradas sorteadas.
 * Com 2 acertos seguidos, aparece sem alternativas: pensar na resposta e conferir.
 */
function Associacao({ c, acoes, semAlternativas }: { c: CartaoAssociacao; acoes: Acoes; semAlternativas?: boolean }) {
  const sorteio = useMemo(() => sortearAlternativas(c), [c])
  const resposta = useMemo(() => formaDaCerta(c), [c])
  if (semAlternativas) return <Conceito c={c} verso={resposta} rotulo="Sem alternativas" acoes={acoes} />
  return <Escolha c={c} pergunta={c.frente} opcoes={sorteio.opcoes} correta={sorteio.correta} acoes={acoes} />
}

function Conceito({ c, acoes, verso, rotulo = 'Pergunta' }: { c: Cartao & { frente: string }; acoes: Acoes; verso?: string; rotulo?: string }) {
  const [virado, setVirado] = useState(false)
  const [naoSabia, setNaoSabia] = useState(false)
  return (
    <article class="cartao">
      <p class="rotulo">{rotulo}</p>
      <Tex class="frente" texto={c.frente} />
      {!virado && (
        <>
          <button class="btn principal virar" onClick={() => setVirado(true)}>
            Mostrar resposta
          </button>
          <BotaoNaoSei tipo={c.tipo} aoTocar={() => { setNaoSabia(true); setVirado(true) }} />
        </>
      )}
      {virado && (
        <Folha
          titulo={naoSabia ? 'Tudo bem, veja a resposta' : 'Resposta'}
          tom={naoSabia ? 'neutro' : undefined}
          pergunta={<Tex texto={c.frente} />}
          rodape={naoSabia ? <BotoesNota avaliar={acoes.avaliar} acertou={false} /> : <><p class="dica centro">Como foi?</p><BotoesNota avaliar={acoes.avaliar} /></>}
        >
          <Tex class="verso" texto={verso ?? (c.tipo === 'conceito' ? c.verso : '')} />
          {c.explicacao && <Explicacao texto={c.explicacao} />}
          <Fonte c={c} />
          <BotaoCorrigir acoes={acoes} />
        </Folha>
      )}
    </article>
  )
}

function Escolha(props: { c: Cartao; pergunta: string; opcoes: string[]; correta: number; acoes: Acoes; embaralhar?: boolean; rotulo?: string }) {
  const { c, pergunta, opcoes, correta, acoes } = props
  const ordem = useMemo(() => {
    const idx = opcoes.map((_, i) => i)
    return props.embaralhar ? embaralhar(idx) : idx
  }, [c.id])
  // -1 = "Não sei": mostra a resposta certa e conta como erro.
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const respondeu = escolhida !== null
  const acertou = escolhida === correta
  const naoSabia = escolhida === -1
  const certaTexto = opcoes[correta].replace(/[*$]/g, '')
  return (
    <article class="cartao">
      <p class="rotulo">{props.rotulo ?? 'Escolha a alternativa correta'}</p>
      <Tex class="frente" texto={pergunta} />
      <div class={`opcoes ${opcoes.length === 2 ? 'duas' : ''}`}>
        {ordem.map((i) => {
          let cls = 'opcao'
          if (respondeu && i === correta) cls += ' certa'
          else if (respondeu && i === escolhida) cls += ' errada'
          return (
            <button class={cls} disabled={respondeu} aria-label={opcoes[i].replace(/[*$]/g, '')} onClick={() => setEscolhida(i)}>
              <Tex texto={opcoes[i]} />
            </button>
          )
        })}
      </div>
      {!respondeu && (
        <BotaoNaoSei tipo={c.tipo} aoTocar={() => setEscolhida(-1)} />
      )}
      {respondeu && (
        <Folha
          titulo={acertou ? '✓ Certo!' : naoSabia ? 'Tudo bem, veja a resposta' : '✕ Não foi dessa vez'}
          tom={acertou ? 'ok' : naoSabia ? 'neutro' : 'erro'}
          pergunta={<Tex texto={pergunta} />}
          rodape={<BotoesNota avaliar={acoes.avaliar} acertou={acertou} />}
        >
          {!acertou && (
            <p class="resposta-certa">
              Resposta certa: <strong>{certaTexto}</strong>
            </p>
          )}
          {c.explicacao && <Explicacao texto={c.explicacao} />}
          <Fonte c={c} />
          <BotaoCorrigir acoes={acoes} />
        </Folha>
      )}
    </article>
  )
}

type Resp = { texto: string; ok: boolean | null; desistiu?: boolean }

function Calculo({ c, acoes }: { c: CartaoCalculo; acoes: Acoes }) {
  const [s, setS] = useState<Sorteio>(() => sortear(c))
  const [etapa, setEtapa] = useState(0)
  const [resps, setResps] = useState<Resp[]>([])
  const [texto, setTexto] = useState('')
  const terminou = resps.length === c.etapas.length
  const acertouTudo = terminou && resps.every((r) => r.ok)
  // A folha mostra o resultado da etapa recém-respondida.
  const mostrando = resps.length > etapa ? etapa : null

  const responder = (valor: string | number, desistiu = false) => {
    const et = c.etapas[etapa]
    const certo = s.respostas[etapa]
    let ok: boolean
    let txt: string
    if (et.opcoes) {
      ok = !desistiu && valor === certo
      txt = desistiu ? '—' : et.opcoes[valor as number]
    } else {
      const n = lerNumero(String(valor))
      if (n === null && !desistiu) return
      ok = !desistiu && n !== null && confere(n, certo, et.casas ?? 2, c.tolerancia ?? 0.02)
      txt = desistiu ? '—' : String(valor)
    }
    setResps([...resps, { texto: txt, ok, desistiu }])
    setTexto('')
  }

  const novoSorteio = () => {
    setS(sortear(c))
    setEtapa(0)
    setResps([])
    setTexto('')
  }

  const respostaCerta = (i: number) => {
    const et = c.etapas[i]
    return et.opcoes ? et.opcoes[s.respostas[i]] : `${formatar(s.respostas[i], et.casas ?? 2)}${et.unidade ? ` ${et.unidade}` : ''}`
  }

  const r = mostrando !== null ? resps[mostrando] : null
  const ultima = mostrando === c.etapas.length - 1

  return (
    <article class="cartao calculo">
      <p class="rotulo">Cálculo · {c.titulo}</p>
      <Tex class="frente" texto={preencher(c.enunciado, s)} />
      <ol class="etapas">
        {c.etapas.map((et, i) => {
          if (i > etapa) return null
          const ri = resps[i]
          return (
            <li class={ri ? (ri.ok ? 'ok' : 'erro') : 'atual'}>
              <Tex class="pergunta" texto={preencher(et.pergunta, s)} />
              {ri ? (
                <details class="etapa-feita">
                  <summary>
                    {ri.ok ? '✓' : '✕'} {respostaCerta(i)} — ver resolução
                  </summary>
                  <div class="resolucao">
                    {et.resolucao.map((linha) => (
                      <Tex texto={preencher(linha, s)} />
                    ))}
                  </div>
                </details>
              ) : et.opcoes ? (
                <div class="opcoes duas">
                  {et.opcoes.map((o, k) => (
                    <button class="opcao" onClick={() => responder(k)}>
                      {o}
                    </button>
                  ))}
                </div>
              ) : (
                <form
                  class="entrada"
                  onSubmit={(e) => {
                    e.preventDefault()
                    responder(texto)
                  }}
                >
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="done"
                    placeholder="sua resposta"
                    value={texto}
                    onInput={(e) => setTexto((e.target as HTMLInputElement).value)}
                    aria-label={`Resposta em ${et.unidade ?? ''}`}
                  />
                  {et.unidade && <span class="unidade">{et.unidade}</span>}
                  <button class="btn principal" type="submit" disabled={lerNumero(texto) === null}>
                    Conferir
                  </button>
                </form>
              )}
              {!ri && (
                <button class="link" onClick={() => responder('', true)}>
                  Não sei — ver a resolução
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {r && mostrando !== null && (
        <Folha
          key={mostrando}
          titulo={r.ok ? '✓ Resposta dentro da tolerância' : r.desistiu ? 'Resolução' : '✕ Ainda não: veja a resolução'}
          tom={r.ok ? 'ok' : r.desistiu ? 'neutro' : 'erro'}
          pergunta={<Tex texto={preencher(c.etapas[mostrando].pergunta, s)} />}
          rodape={
            ultima ? (
              <BotoesNota avaliar={acoes.avaliar} acertou={acertouTudo} />
            ) : (
              <button class="btn principal" onClick={() => setEtapa(etapa + 1)}>
                Próxima etapa →
              </button>
            )
          }
        >
          <p class="resposta-certa">
            {!r.ok && !r.desistiu && <>Você: {r.texto} · </>}
            Certo: <strong>{respostaCerta(mostrando)}</strong>
          </p>
          <div class="resolucao">
            {c.etapas[mostrando].resolucao.map((linha) => (
              <Tex texto={preencher(linha, s)} />
            ))}
          </div>
          {ultima && (
            <>
              {c.explicacao && <Explicacao texto={c.explicacao} />}
              <Fonte c={c} />
              <button class="btn terciario compacto" onClick={novoSorteio}>
                Treinar de novo com outros números (não conta)
              </button>
              <BotaoCorrigir acoes={acoes} />
            </>
          )}
        </Folha>
      )}
      {terminou && mostrando === null && <BotoesNota avaliar={acoes.avaliar} acertou={acertouTudo} />}
    </article>
  )
}
