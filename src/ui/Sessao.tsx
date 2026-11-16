import { useEffect, useMemo, useState } from 'preact/hooks'
import { confere, formatar, lerNumero, preencher, sortear, type Sorteio } from '../core/calc'
import { db, type Nota } from '../core/db'
import { filaEspacada, filaProva, posicaoReinsercao, type OpcoesFila } from '../core/fila'
import { formaDaCerta, sortearAlternativas } from '../core/alternativas'
import { chave, dominado, registrar } from '../core/srs'
import type { Baralho, Cartao, CartaoAssociacao, CartaoCalculo } from '../core/types'
import { nomeTema } from './estado'
import { CorrigirCartao } from './CorrigirCartao'
import { enviarCartao } from './enviar'
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

export function Sessao({ baralho: inicial, modo, opcoes, limite, sair, criarMais }: { baralho: Baralho; modo: Modo; opcoes: OpcoesFila; limite?: Limite; sair: () => void; criarMais: (assunto?: string) => void }) {
  // Cópia local: correções feitas durante a sessão entram aqui sem reiniciar a sessão.
  const [baralho, setBaralho] = useState(inicial)
  const [corrigindo, setCorrigindo] = useState(false)
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

  const bateuMeta = meta > 0 && placar.certos >= meta
  const cartao = esgotou || bateuMeta ? undefined : fila[pos]
  const avaliar = async (nota: Nota, chute = false) => {
    if (!cartao) return
    try {
      await registrar(chave(baralho.id, cartao.id), nota, modo)
    } catch (e) {
      console.error('Não foi possível salvar o progresso', e) // a sessão continua mesmo assim
    }
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
    setPlacar((p) => ({ ...p, pulados: p.pulados + 1 }))
    if (pos < fila.length - 1) {
      const nova = [...fila]
      nova.push(nova.splice(pos, 1)[0])
      setFila(nova)
      setVez((v) => v + 1)
    } else setPos(pos + 1)
    window.scrollTo(0, 0)
  }

  const acoes: Acoes = { avaliar, corrigir: () => setCorrigindo(true) }

  /** Cartão corrigido: troca na sessão e mostra de novo, para responder já com o conteúdo certo. */
  const corrigido = (c: Cartao, b: Baralho) => {
    setBaralho(b)
    setFila(fila.map((x) => (x.id === c.id ? c : x)))
    setVez((v) => v + 1)
    setCorrigindo(false)
  }

  return (
    <main class="tela sessao">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Sair da sessão" onClick={sair}>
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
        <Fim placar={placar} vazio={fila.length === 0} modo={modo} tempo={porTempo ? (esgotou ? 'esgotado' : relogio(totalMs - restante)) : undefined} bateuMeta={bateuMeta} outra={() => setRodada((r) => r + 1)} sair={sair} temaFraco={temaFraco(baralho, fracos)} criarMais={criarMais} />
      ) : (
        <>
          <div class="meta-cartao">
            <span class="tema-chip">{nomeTema(baralho, cartao.tema)}</span>
            <button class="icone-btn" aria-label="Enviar este cartão" title="Enviar este cartão" onClick={() => enviarCartao(baralho, cartao)}>
              <Icone nome="enviar" />
            </button>
          </div>
          <CartaoView key={`${pos}-${vez}-${cartao.id}`} cartao={cartao} acoes={acoes} semAlternativas={dominados.has(cartao.id)} />
          <div class="acoes-cartao">
            <button class="btn terciario" onClick={pular}>
              Pular
            </button>
            <button class="btn terciario" onClick={() => setCorrigindo(true)}>
              Corrigir cartão
            </button>
          </div>
          {corrigindo && <CorrigirCartao baralho={baralho} cartao={cartao} aoSalvar={corrigido} fechar={() => setCorrigindo(false)} />}
        </>
      )}
    </main>
  )
}

/** Nome do tema com mais erros e chutes na sessão (ou nada, se não houve). */
function temaFraco(b: Baralho, fracos: Record<string, number>): string | undefined {
  const [id] = Object.entries(fracos).sort((a, z) => z[1] - a[1])[0] ?? []
  return id ? nomeTema(b, id) : undefined
}

function Fim(props: {
  placar: { certos: number; errados: number; chutes: number; pulados: number }
  vazio: boolean
  modo: Modo
  tempo?: string
  bateuMeta?: boolean
  temaFraco?: string
  outra: () => void
  sair: () => void
  criarMais: (assunto?: string) => void
}) {
  const { placar, vazio, modo, tempo, bateuMeta, temaFraco, outra, sair, criarMais } = props
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
              : 'Variar as perguntas ajuda a fixar. Use outra aula ou um resumo para a IA criar cartões novos.'}
          </p>
          <button class="btn secundario" onClick={() => criarMais(temaFraco)}>
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

function CartaoView({ cartao, acoes, semAlternativas }: { cartao: Cartao; acoes: Acoes; semAlternativas?: boolean }) {
  switch (cartao.tipo) {
    case 'conceito':
      return <Conceito c={cartao} acoes={acoes} />
    case 'vf':
      return <Escolha c={cartao} pergunta={cartao.frente} opcoes={['Verdadeiro', 'Falso']} correta={cartao.resposta ? 0 : 1} acoes={acoes} rotulo="Verdadeiro ou falso" />
    case 'associacao':
      return <Associacao c={cartao} acoes={acoes} semAlternativas={semAlternativas} />
    case 'calculo':
      return <Calculo c={cartao} acoes={acoes} />
  }
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
        <Folha titulo="Resposta" rodape={<><p class="dica centro">Como foi?</p><BotoesNota avaliar={acoes.avaliar} /></>}>
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
    if (props.embaralhar) idx.sort(() => Math.random() - 0.5)
    return idx
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
        <button class="btn terciario nao-sei" onClick={() => setEscolhida(-1)}>
          Não sei
        </button>
      )}
      {respondeu && (
        <Folha
          titulo={acertou ? '✓ Certo!' : naoSabia ? 'Tudo bem, veja a resposta' : '✕ Não foi dessa vez'}
          tom={acertou ? 'ok' : naoSabia ? 'neutro' : 'erro'}
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
