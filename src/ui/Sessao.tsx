import { useEffect, useMemo, useState } from 'preact/hooks'
import { confere, formatar, lerNumero, preencher, sortear, type Sorteio } from '../core/calc'
import { embaralhar } from '../core/aleatorio'
import { db, type Nota } from '../core/db'
import { filaEspacada, filaProva, posicaoReinsercao, type OpcoesFila } from '../core/fila'
import { formaDaCerta, sortearAlternativas } from '../core/alternativas'
import { chave, dominado, registrar } from '../core/srs'
import { evento } from '../core/telemetria'
import { formasAceitas, NIVEIS_COM_ALTERNATIVAS, partesDaFrente } from '../core/lacunas'
import type { Baralho, Cartao, CartaoAssociacao, CartaoCalculo, CartaoLacunas, Objetivo } from '../core/types'
import { nomeTema } from './estado'
import { CorrigirCartao } from './CorrigirCartao'
import { EditarCartao } from './EditarCartao'
import { conteudoCartao } from './enviar'
import { EnviarModal } from './EnviarModal'
import { Folha } from './Folha'
import { Icone } from './Icone'
import { Tex } from './Tex'

export type Modo = 'prova' | 'espacada' | 'calculo'
/** Até onde vai a sessão: N cartões ou X minutos. */
export type Limite = { tipo: 'acertos'; n: number } | { tipo: 'tempo'; minutos: number }

const TODOS = 10000 // por tempo: a fila tem todos os cartões; o relógio decide o fim

const relogio = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const TITULO: Record<Modo, string> = { prova: 'Estudar', espacada: 'Estudar', calculo: 'Cálculo' }

/** Ações que o cartão pode usar dentro da folha de resultado. */
interface Acoes {
  /** `chute`: acertou chutando — registra como difícil, mas não conta como acerto. */
  avaliar: (n: Nota, chute?: boolean) => void
  corrigir: () => void
}

export function Sessao({ baralho: inicial, modo, opcoes, limite, sair, criarMais }: { baralho: Baralho; modo: Modo; opcoes: OpcoesFila; limite?: Limite; sair: () => void; criarMais: (assunto?: string, temaId?: string) => void }) {
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
  // Erros e chutes por tema, para sugerir onde criar mais cartões no fim.
  const [fracos, setFracos] = useState<Record<string, number>>({})
  const [fila, setFila] = useState<Cartao[] | null>(null)
  // Cartões de alternativas já dominados no início da sessão: aparecem sem alternativas.
  const [dominados, setDominados] = useState<Set<string>>(new Set())
  const [pos, setPos] = useState(0)
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

  // Relógio da sessão por tempo: atualiza a cada segundo até acabar.
  useEffect(() => {
    if (!porTempo || !fimEm || esgotou) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [porTempo, fimEm, esgotou])

  useEffect(() => {
    db.estados.toArray().then((l) => {
      const m = new Map(l.map((e) => [e.id, e]))
      // Por tempo ou por acertos, a fila tem todos os cartões; o relógio ou a meta decidem o fim.
      const tamanho = limite ? TODOS : modo === 'calculo' ? 10 : 20
      const f = modo === 'espacada' ? filaEspacada(baralho, m, { ...opcoes, tamanho }, porTempo ? 100 : Math.min(tamanho, 15)) : filaProva(baralho, m, { ...opcoes, tamanho })
      setFila(f)
      setDominados(new Set(baralho.cartoes.filter((c) => dominado(m.get(chave(baralho.id, c.id)))).map((c) => c.id)))
      setPos(0)
      setPlacar({ certos: 0, errados: 0, chutes: 0, pulados: 0 })
      setFracos({})
      if (porTempo) {
        setAgora(Date.now())
        setFimEm(Date.now() + totalMs)
      }
    })
  }, [rodada])

  if (!fila) return <main class="tela"><p>Carregando…</p></main>
  const fracoId = temaFracoId(fracos)

  const bateuMeta = meta > 0 && placar.certos >= meta
  const cartao = esgotou || bateuMeta ? undefined : fila[pos]
  const respondidos = placar.certos + placar.errados + placar.chutes
  const avaliar = async (nota: Nota, chute = false) => {
    if (!cartao) return
    try {
      await registrar(chave(baralho.id, cartao.id), nota, modo)
    } catch (e) {
      console.error('Não foi possível salvar o progresso', e) // a sessão continua mesmo assim
    }
    evento('resposta', { tipo: cartao.tipo, nota, chute, sem_alternativas: dominados.has(cartao.id) })
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
    if (cartao) evento('sessao_abandonada', { respondidos, por: porTempo ? 'tempo' : 'acertos' })
    sair()
  }

  /** Cartão corrigido: troca na sessão e mostra de novo, para responder já com o conteúdo certo. */
  const corrigido = (c: Cartao, b: Baralho) => {
    setBaralho(b)
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
      <header class="barra-sessao">
        <button class="fechar" aria-label="Sair da sessão" onClick={sairDaSessao}>
          ←
        </button>
        <span class="titulo-barra">{TITULO[modo]}</span>
        <span class="contador" aria-live="off">
          {!cartao ? '' : porTempo ? relogio(restante) : meta ? `✓ ${placar.certos}/${meta}` : `${pos + 1} de ${fila.length}`}
        </span>
      </header>
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
      {!porTempo && !meta && fila.length > 0 && (
        <div class="progresso" role="progressbar" aria-label="Progresso da sessão" aria-valuemin={0} aria-valuemax={fila.length} aria-valuenow={pos}>
          <div style={{ width: `${(100 * pos) / fila.length}%` }} />
        </div>
      )}

      {!cartao ? (
        <Fim
          fimMotivo={fila.length === 0 ? 'vazia' : bateuMeta ? 'meta' : esgotou ? 'tempo' : 'fila'}
          placar={placar}
          vazio={fila.length === 0}
          modo={modo}
          tempo={porTempo ? (esgotou ? 'esgotado' : relogio(totalMs - restante)) : undefined}
          bateuMeta={bateuMeta}
          outra={() => setRodada((r) => r + 1)}
          sair={sair}
          temaFraco={fracoId ? nomeTema(baralho, fracoId) : undefined}
          temaId={fracoId}
          objetivo={baralho.objetivo}
          criarMais={criarMais}
        />
      ) : (
        <>
          <div class="meta-cartao">
            <span class="tema-chip">{nomeTema(baralho, cartao.tema)}</span>
            <button class="icone-btn" aria-label="Enviar este cartão" title="Enviar este cartão" onClick={() => setEnviando(cartao)}>
              <Icone nome="enviar" />
            </button>
          </div>
          <CartaoView key={`${pos}-${vez}-${cartao.id}`} cartao={cartao} acoes={acoes} semAlternativas={dominados.has(cartao.id)} facil={!!baralho.objetivo?.nivel && (NIVEIS_COM_ALTERNATIVAS as readonly string[]).includes(baralho.objetivo.nivel)} distratores={respostasDoBaralho(baralho)} />
          <div class="acoes-cartao">
            <button class="btn terciario" onClick={pular}>
              Pular
            </button>
            <button class="btn terciario" onClick={() => setCorrigindo(true)}>
              Corrigir cartão
            </button>
          </div>
          {corrigindo && <CorrigirCartao baralho={baralho} cartao={cartao} aoSalvar={corrigido} fechar={() => setCorrigindo(false)} corrigirEuMesmo={abrirEditor} />}
          {enviando && <EnviarModal conteudo={conteudoCartao(baralho, enviando)} onde="estudo" fechar={() => setEnviando(null)} />}
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
  temaId?: string
  objetivo?: Objetivo
  outra: () => void
  sair: () => void
  criarMais: (assunto?: string, temaId?: string) => void
}) {
  const { placar, vazio, modo, tempo, bateuMeta, temaFraco, temaId, objetivo, outra, sair, criarMais } = props
  // Sem tema fraco: se há foco no objetivo, a IA aprofunda nele; senão, o assunto fica em branco.
  const assuntoSugerido = temaFraco ?? (objetivo?.foco?.length ? `Aprofundar: ${objetivo.foco.join(', ')}` : undefined)
  useEffect(() => evento('sessao_concluida', { motivo: props.fimMotivo, ...placar }), [])
  if (vazio)
    return (
      <section class="fim">
        <span class="icone-fim"><Icone nome="avancar" tamanho={48} /></span>
        <p>{modo === 'espacada' ? 'Nada para revisar agora.' : 'Nenhum cartão nesses temas.'}</p>
        <button class="btn principal" onClick={sair}>Voltar ao início</button>
      </section>
    )
  const total = placar.certos + placar.errados + placar.chutes
  return (
    <section class="fim">
      <span class="icone-fim"><Icone nome="avancar" tamanho={48} /></span>
      <h2>{bateuMeta ? 'Meta atingida!' : tempo === 'esgotado' ? 'Tempo esgotado' : 'Sessão concluída'}</h2>
      <p>
        {placar.certos} {placar.certos === 1 ? 'acerto' : 'acertos'}, {placar.errados} {placar.errados === 1 ? 'erro' : 'erros'}
        {placar.chutes > 0 && <> e {placar.chutes} {placar.chutes === 1 ? 'chute' : 'chutes'}</>} em {total} {total === 1 ? 'resposta' : 'respostas'}
        {placar.pulados > 0 && <>; {placar.pulados} {placar.pulados === 1 ? 'pulo' : 'pulos'}</>}.
      </p>
      {total > 0 && <p class="placar-final">{Math.round((100 * placar.certos) / total)}% de acerto</p>}
      {tempo && tempo !== 'esgotado' && <p class="dica">Terminou os cartões em {tempo}.</p>}
      <p class="dica">Os cartões errados voltam primeiro na próxima rodada.</p>
      <section class="incentivo-ia">
        <Icone nome="entender" />
        <div>
          <strong>Que tal mais cartões?</strong>
          <p>
            {temaFraco
              ? `Você teve mais dificuldade em “${temaFraco}”. A IA cria cartões novos sobre esse tema em poucos minutos.`
              : objetivo?.resumo
                ? `Quer avançar em ${objetivo.resumo}? A IA cria mais cartões em poucos minutos.`
                : 'Variar as perguntas ajuda a fixar. Use outra aula ou um resumo para a IA criar cartões novos.'}
          </p>
          <button class="btn secundario" onClick={() => { evento('sugestao_mais_cartoes'); criarMais(assuntoSugerido, temaId) }}>
            {temaFraco ? `Criar cartões sobre ${temaFraco}` : 'Criar mais cartões com IA'}
          </button>
        </div>
      </section>
      <button class="btn principal" onClick={outra}>
        <span class="com-icone"><Icone nome="praticar" /> Mais uma rodada</span>
      </button>
      <button class="btn secundario" onClick={sair}>Voltar ao início</button>
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
 * Como foi a resposta. Pergunta e resposta: as cinco opções.
 * Alternativas, V/F e cálculo já sabem se acertou: se acertou, só como; se errou, só Continuar.
 * Notas do agendamento: fácil = 3, com dificuldade = 2, no chute = 2 (não conta acerto), não sabia/errei = 1.
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
  return (
    <div class="notas" role="group" aria-label="Como foi?">
      <button class="btn nota n4" onClick={() => avaliar(3)}>
        Acertei, foi fácil
      </button>
      <button class="btn nota n3" onClick={() => avaliar(2)}>
        Acertei, com dificuldade
      </button>
      <button class="btn nota n2" onClick={() => avaliar(2, true)}>
        Acertei no chute
      </button>
      {acertou === undefined && (
        <>
          <button class="btn nota n1" onClick={() => avaliar(1)}>
            Não sabia
          </button>
          <button class="btn nota n1" onClick={() => avaliar(1)}>
            Errei
          </button>
        </>
      )}
    </div>
  )
}

/** Respostas de outras lacunas do baralho: alternativas erradas plausíveis no nível fácil. */
function respostasDoBaralho(b: Baralho): string[] {
  return b.cartoes.flatMap((c) => (c.tipo === 'lacunas' ? c.respostas.map((r) => formasAceitas(r)[0]) : []))
}

function CartaoView({ cartao, acoes, semAlternativas, facil, distratores }: { cartao: Cartao; acoes: Acoes; semAlternativas?: boolean; facil?: boolean; distratores?: string[] }) {
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
          <button class="btn principal virar" onClick={mostrar}>
            Mostrar resposta
          </button>
        )}
        {virado && (
          <Folha titulo="Resposta" rodape={<><p class="dica centro">Como foi?</p><BotoesNota avaliar={acoes.avaliar} /></>}>
            {fraseComRespostas}
            {c.explicacao && <Explicacao texto={c.explicacao} />}
            <Fonte c={c} />
            <button class="btn terciario compacto" onClick={acoes.corrigir}>
              Cartão errado? Corrigir
            </button>
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
            <button class="btn terciario nao-sei" onClick={() => { evento('nao_sei', { tipo: c.tipo }); setNaoSabia(true) }}>
              Não sei
            </button>
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
          <button class="btn terciario compacto" onClick={acoes.corrigir}>
            Cartão errado? Corrigir
          </button>
        </Folha>
      )}
    </article>
  )
}

/**
 * Alternativas: a cada vez, uma forma da certa e 3 erradas sorteadas.
 * Se o cartão já está dominado, aparece sem alternativas: pensar na resposta e conferir.
 */
function Associacao({ c, acoes, semAlternativas }: { c: CartaoAssociacao; acoes: Acoes; semAlternativas?: boolean }) {
  const sorteio = useMemo(() => sortearAlternativas(c), [c])
  const resposta = useMemo(() => formaDaCerta(c), [c])
  if (semAlternativas) return <Conceito c={c} verso={resposta} rotulo="Sem alternativas" acoes={acoes} />
  return <Escolha c={c} pergunta={c.frente} opcoes={sorteio.opcoes} correta={sorteio.correta} acoes={acoes} />
}

function Conceito({ c, acoes, verso, rotulo = 'Pergunta' }: { c: Cartao & { frente: string }; acoes: Acoes; verso?: string; rotulo?: string }) {
  const [virado, setVirado] = useState(false)
  return (
    <article class="cartao">
      <p class="rotulo">{rotulo}</p>
      <Tex class="frente" texto={c.frente} />
      {!virado && (
        <button class="btn principal virar" onClick={() => setVirado(true)}>
          Mostrar resposta
        </button>
      )}
      {virado && (
        <Folha titulo="Resposta" pergunta={<Tex texto={c.frente} />} rodape={<><p class="dica centro">Como foi?</p><BotoesNota avaliar={acoes.avaliar} /></>}>
          <Tex class="verso" texto={verso ?? (c.tipo === 'conceito' ? c.verso : '')} />
          {c.explicacao && <Explicacao texto={c.explicacao} />}
          <Fonte c={c} />
          <button class="btn terciario compacto" onClick={acoes.corrigir}>
            Cartão errado? Corrigir
          </button>
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
        <button class="btn terciario nao-sei" onClick={() => { evento('nao_sei', { tipo: c.tipo }); setEscolhida(-1) }}>
          Não sei
        </button>
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
          <button class="btn terciario compacto" onClick={acoes.corrigir}>
            Cartão errado? Corrigir
          </button>
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
              <button class="btn terciario compacto" onClick={acoes.corrigir}>
                Cartão errado? Corrigir
              </button>
            </>
          )}
        </Folha>
      )}
      {terminou && mostrando === null && <BotoesNota avaliar={acoes.avaliar} acertou={acertouTudo} />}
    </article>
  )
}
