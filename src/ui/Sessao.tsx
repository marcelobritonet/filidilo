import { useEffect, useMemo, useState } from 'preact/hooks'
import { confere, formatar, lerNumero, preencher, sortear, type Sorteio } from '../core/calc'
import { db, type Nota } from '../core/db'
import { filaEspacada, filaProva, posicaoReinsercao, type OpcoesFila } from '../core/fila'
import { chave, registrar } from '../core/srs'
import type { Baralho, Cartao, CartaoCalculo } from '../core/types'
import { nomeTema } from './estado'
import { Folha } from './Folha'
import { Icone } from './Icone'
import { Reportar } from './Reportar'
import { Tex } from './Tex'

export type Modo = 'prova' | 'espacada' | 'calculo'

const TITULO: Record<Modo, string> = { prova: 'Modo prova', espacada: 'Revisão espaçada', calculo: 'Exercícios de cálculo' }

/** Ações que o cartão pode usar dentro da folha de resultado. */
interface Acoes {
  avaliar: (n: Nota) => void
  reportar: () => void
}

export function Sessao({ baralho, modo, opcoes, sair }: { baralho: Baralho; modo: Modo; opcoes: OpcoesFila; sair: () => void }) {
  const [fila, setFila] = useState<Cartao[] | null>(null)
  const [pos, setPos] = useState(0)
  const [placar, setPlacar] = useState({ certos: 0, errados: 0, pulados: 0 })
  const [reportando, setReportando] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [vez, setVez] = useState(0) // força remontar o cartão ao pular

  useEffect(() => {
    db.estados.toArray().then((l) => {
      const m = new Map(l.map((e) => [e.id, e]))
      const f = modo === 'espacada' ? filaEspacada(baralho, m, opcoes) : filaProva(baralho, m, { ...opcoes, tamanho: modo === 'calculo' ? 10 : 20 })
      setFila(f)
      setPos(0)
      setPlacar({ certos: 0, errados: 0, pulados: 0 })
    })
  }, [rodada])

  if (!fila) return <main class="tela"><p>Carregando…</p></main>

  const cartao = fila[pos]
  const avaliar = async (nota: Nota) => {
    try {
      await registrar(chave(baralho.id, cartao.id), nota, modo)
    } catch (e) {
      console.error('Não foi possível salvar o progresso', e) // a sessão continua mesmo assim
    }
    setPlacar((p) => (nota === 1 ? { ...p, errados: p.errados + 1 } : { ...p, certos: p.certos + 1 }))
    if (nota === 1) {
      // Errou: o cartão volta daqui a alguns cartões nesta mesma sessão.
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

  const acoes: Acoes = { avaliar, reportar: () => setReportando(true) }

  return (
    <main class="tela sessao">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Sair da sessão" onClick={sair}>
          ←
        </button>
        <span class="titulo-barra">{TITULO[modo]}</span>
        <span class="contador">{cartao ? `${pos + 1} de ${fila.length}` : ''}</span>
      </header>
      {fila.length > 0 && (
        <div class="progresso" role="progressbar" aria-label="Progresso da sessão" aria-valuemin={0} aria-valuemax={fila.length} aria-valuenow={pos}>
          <div style={{ width: `${(100 * pos) / fila.length}%` }} />
        </div>
      )}

      {!cartao ? (
        <Fim placar={placar} vazio={fila.length === 0} modo={modo} outra={() => setRodada((r) => r + 1)} sair={sair} />
      ) : (
        <>
          <div class="meta-cartao">
            <span class="tema-chip">{nomeTema(baralho, cartao.tema)}</span>
          </div>
          <CartaoView key={`${pos}-${vez}-${cartao.id}`} cartao={cartao} acoes={acoes} />
          <div class="acoes-cartao">
            <button class="btn terciario" onClick={pular}>
              Pular
              <small>{pos < fila.length - 1 ? 'volta no fim da sessão' : 'termina a sessão'}</small>
            </button>
            <button class="btn terciario" onClick={() => setReportando(true)}>
              Reportar erro
            </button>
          </div>
          {reportando && <Reportar baralho={baralho} cartao={cartao} fechar={() => setReportando(false)} />}
        </>
      )}
    </main>
  )
}

function Fim({ placar, vazio, modo, outra, sair }: { placar: { certos: number; errados: number; pulados: number }; vazio: boolean; modo: Modo; outra: () => void; sair: () => void }) {
  if (vazio)
    return (
      <section class="fim">
        <span class="icone-fim"><Icone nome="avancar" tamanho={48} /></span>
        <p>{modo === 'espacada' ? 'Nada para revisar agora. Volte mais tarde ou use o modo prova.' : 'Nenhum cartão com esse filtro.'}</p>
        <button class="btn principal" onClick={sair}>Voltar ao início</button>
      </section>
    )
  const total = placar.certos + placar.errados
  return (
    <section class="fim">
      <span class="icone-fim"><Icone nome="avancar" tamanho={48} /></span>
      <h2>Sessão concluída</h2>
      <p>
        {placar.certos} acertos e {placar.errados} erros em {total} respostas
        {placar.pulados > 0 && <>; {placar.pulados} {placar.pulados === 1 ? 'pulo' : 'pulos'}</>}.
      </p>
      <p class="dica">Os cartões errados voltam primeiro na próxima rodada do modo prova.</p>
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

function BotoesNota({ avaliar, acertou }: { avaliar: (n: Nota) => void; acertou?: boolean }) {
  if (acertou === false)
    return (
      <div class="notas">
        <button class="btn nota n1 largo" onClick={() => avaliar(1)}>
          Continuar
          <small>este cartão volta daqui a pouco</small>
        </button>
      </div>
    )
  return (
    <div class={`notas ${acertou ? 'tres' : ''}`} role="group" aria-label="Como foi?">
      {acertou === undefined && (
        <button class="btn nota n1" onClick={() => avaliar(1)}>
          Errei
        </button>
      )}
      <button class="btn nota n2" onClick={() => avaliar(2)}>
        {acertou ? 'Chutei' : 'Difícil'}
      </button>
      <button class="btn nota n3" onClick={() => avaliar(3)}>
        Acertei
      </button>
      <button class="btn nota n4" onClick={() => avaliar(4)}>
        Fácil
      </button>
    </div>
  )
}

const LinkReportar = ({ acoes }: { acoes: Acoes }) => (
  <button class="btn terciario compacto reportar-folha" onClick={acoes.reportar}>
    Reportar erro neste cartão
  </button>
)

function CartaoView({ cartao, acoes }: { cartao: Cartao; acoes: Acoes }) {
  switch (cartao.tipo) {
    case 'conceito':
      return <Conceito c={cartao} acoes={acoes} />
    case 'vf':
      return <Escolha c={cartao} pergunta={cartao.frente} opcoes={['Verdadeiro', 'Falso']} correta={cartao.resposta ? 0 : 1} acoes={acoes} rotulo="Verdadeiro ou falso" />
    case 'associacao':
      return <Escolha c={cartao} pergunta={cartao.frente} opcoes={cartao.opcoes} correta={cartao.correta} acoes={acoes} embaralhar />
    case 'calculo':
      return <Calculo c={cartao} acoes={acoes} />
  }
}

function Conceito({ c, acoes }: { c: Extract<Cartao, { tipo: 'conceito' }>; acoes: Acoes }) {
  const [virado, setVirado] = useState(false)
  return (
    <article class="cartao">
      <p class="rotulo">Pergunta</p>
      <Tex class="frente" texto={c.frente} />
      {!virado && (
        <button class="btn principal virar" onClick={() => setVirado(true)}>
          Mostrar resposta
        </button>
      )}
      {virado && (
        <Folha titulo="Resposta" rodape={<><p class="dica centro">Como foi?</p><BotoesNota avaliar={acoes.avaliar} /></>}>
          <Tex class="verso" texto={c.verso} />
          {c.explicacao && <Explicacao texto={c.explicacao} />}
          <Fonte c={c} />
          <LinkReportar acoes={acoes} />
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
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const respondeu = escolhida !== null
  const acertou = escolhida === correta
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
      {respondeu && (
        <Folha titulo={acertou ? '✓ Certo!' : '✕ Não foi dessa vez'} tom={acertou ? 'ok' : 'erro'} rodape={<BotoesNota avaliar={acoes.avaliar} acertou={acertou} />}>
          {!acertou && (
            <p class="resposta-certa">
              Resposta certa: <strong>{certaTexto}</strong>
            </p>
          )}
          {c.explicacao && <Explicacao texto={c.explicacao} />}
          <Fonte c={c} />
          <LinkReportar acoes={acoes} />
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
              <LinkReportar acoes={acoes} />
            </>
          )}
        </Folha>
      )}
      {terminou && mostrando === null && <BotoesNota avaliar={acoes.avaliar} acertou={acertouTudo} />}
    </article>
  )
}
