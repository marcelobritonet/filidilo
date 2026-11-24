import { useEffect, useMemo, useState } from 'preact/hooks'
import { db, type Estado, type Revisao, type SessaoGravada } from '../core/db'
import { conquistasAtingidas, type Marco } from '../core/conquistas'
import { andamento, gravarMetaSemana, lerMetaGravada, OPCOES_DIAS, OPCOES_MINUTOS, type MetaSemana } from '../core/metaSemana'
import { diaLocal, lerOfensiva, sequencia, type Ofensiva } from '../core/ofensiva'
import { calcularPainel, ddmmDe, textoMinutos, type Barra, type Periodo, type TemaLinha } from '../core/painel'
import { lerDominioGravado, type DominioDia } from '../core/sessoes'
import { evento } from '../core/telemetria'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'
import { chaveEscolha, lerEscolha } from './Inicio'

interface Dados {
  revisoes: Pick<Revisao, 'cartao' | 'nota' | 'data'>[]
  sessoes: SessaoGravada[]
  estados: Estado[]
  ofensiva: Ofensiva
  dominio: DominioDia[]
  meta: MetaSemana | null
  conquistas: Marco[]
}

const CHAVE_FILTRO = 'tatino-progresso-filtro'
const PERIODOS: { valor: Periodo; nome: string }[] = [
  { valor: '7', nome: '7 dias' },
  { valor: '30', nome: '30 dias' },
  { valor: 'tudo', nome: 'Tudo' },
]

function lerFiltro(): { periodo: Periodo; baralho: string } {
  try {
    const x = JSON.parse(localStorage.getItem(CHAVE_FILTRO) ?? '{}') as { periodo?: string; baralho?: string }
    return { periodo: x.periodo === '30' || x.periodo === 'tudo' ? x.periodo : '7', baralho: typeof x.baralho === 'string' ? x.baralho : '' }
  } catch {
    return { periodo: '7', baralho: '' }
  }
}

const pct = (x: number) => `${Math.round(100 * x)}%`
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

/** Seu progresso: tudo o que as respostas e as sessões dizem, numa tela só, fora do caminho do estudo. */
export function Progresso({ baralhos, nav }: { baralhos: Baralho[]; nav: Navegacao }) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [filtro, setFiltro] = useState(lerFiltro)
  const [ver, setVer] = useState<'respostas' | 'tempo'>('respostas')
  const [todosTemas, setTodosTemas] = useState(false)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const ativosBaralhos = baralhos.filter((b) => !b.arquivadoEm)
  const baralho = ativosBaralhos.some((b) => b.id === filtro.baralho) ? filtro.baralho : ''

  const carregar = () =>
    Promise.all([db.revisoes.toArray(), db.sessoes.toArray(), db.estados.toArray(), lerOfensiva(), lerDominioGravado(), lerMetaGravada(), conquistasAtingidas(baralhos)]).then(
      ([revisoes, sessoes, estados, ofensiva, dominio, meta, conquistas]) => setDados({ revisoes, sessoes, estados, ofensiva, dominio, meta, conquistas }),
    )
  useEffect(() => {
    carregar()
  }, [])

  const mudarFiltro = (f: { periodo: Periodo; baralho: string }) => {
    setFiltro(f)
    localStorage.setItem(CHAVE_FILTRO, JSON.stringify(f))
    evento('progresso_filtro', { periodo: f.periodo, baralho: f.baralho ? 'um' : 'todos' })
  }

  const agora = useMemo(() => Date.now(), [dados])
  const painel = useMemo(
    () => (dados ? calcularPainel({ ...dados, baralhos, periodo: filtro.periodo, baralho: baralho || undefined, agora }) : null),
    [dados, filtro.periodo, baralho, baralhos],
  )

  const estudarTema = (t: TemaLinha) => {
    // Abre a tela do baralho com só este tema marcado em "Como estudar?".
    localStorage.setItem(chaveEscolha(t.baralho), JSON.stringify({ ...lerEscolha(t.baralho), temas: [t.tema] }))
    evento('progresso_estudar_tema')
    nav.ir({ nome: 'baralho', id: t.baralho })
  }

  const cabecalho = (
    <header class="barra-sessao">
      <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>
        ←
      </button>
      <h1 class="titulo-barra">Seu progresso</h1>
      <span />
    </header>
  )

  if (!dados || !painel)
    return (
      <main class="tela progresso-tela">
        {cabecalho}
        <p>Carregando…</p>
      </main>
    )

  const semRespostaNenhuma = dados.revisoes.length === 0
  if (semRespostaNenhuma)
    return (
      <main class="tela progresso-tela">
        {cabecalho}
        <section class="bloco centro">
          <p>Seu progresso aparece aqui depois da primeira sessão de estudo.</p>
          <button class="btn principal" onClick={nav.voltar}>
            Escolher um baralho
          </button>
        </section>
      </main>
    )

  const hoje = diaLocal(agora)
  const metaAgora = dados.meta ? andamento(dados.meta, dados.ofensiva, dados.sessoes, hoje) : null
  const temas = todosTemas ? painel.temas : painel.temas.slice(0, 5)
  const maxTema = Math.max(1, ...painel.temas.map((t) => t.respostas))
  const comTempo = painel.ritmo.minutos !== null
  const nomeBaralho = (id: string) => baralhos.find((b) => b.id === id)?.titulo ?? ''

  return (
    <main class="tela progresso-tela">
      {cabecalho}

      <div class="segmentado" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button class={filtro.periodo === p.valor ? 'ativo' : ''} aria-pressed={filtro.periodo === p.valor} onClick={() => mudarFiltro({ ...filtro, periodo: p.valor })}>
            {p.nome}
          </button>
        ))}
      </div>
      {ativosBaralhos.length > 1 && (
        <label class="campo filtro-baralho">
          <select aria-label="Baralho" value={baralho} onChange={(e) => mudarFiltro({ ...filtro, baralho: (e.target as HTMLSelectElement).value })}>
            <option value="">Todos os baralhos</option>
            {ativosBaralhos.map((b) => (
              <option value={b.id}>{b.titulo}</option>
            ))}
          </select>
        </label>
      )}

      {/* 1 · Meta da semana (vale para todos os baralhos) */}
      <section class="bloco painel-bloco" aria-labelledby="t-meta">
        <div class="painel-topo">
          <h2 id="t-meta">Meta da semana</h2>
          {metaAgora && (
            <button class="link" onClick={() => setEditandoMeta(true)}>
              Mudar
            </button>
          )}
        </div>
        {metaAgora ? (
          <>
            <p class="painel-numero">
              {metaAgora.meta.tipo === 'dias' ? `${Math.min(metaAgora.feito, 7)} de ${plural(metaAgora.meta.n, 'dia', 'dias')}` : `${textoMinutos(metaAgora.feito)} de ${textoMinutos(metaAgora.meta.n)}`}
              {metaAgora.batida && <span class="painel-selo"> ✓ batida</span>}
            </p>
            <span class="barra" role="progressbar" aria-label="Andamento da meta da semana" aria-valuemin={0} aria-valuemax={metaAgora.meta.n} aria-valuenow={Math.min(metaAgora.feito, metaAgora.meta.n)}>
              <span style={{ width: `${Math.min(100, (100 * metaAgora.feito) / metaAgora.meta.n)}%` }} />
            </span>
            <p class="dica painel-dica">Semana de domingo a sábado{metaAgora.meta.tipo === 'dias' ? ', dias com sessão concluída' : ''}.</p>
          </>
        ) : (
          <>
            <p class="dica painel-dica">Escolha quantos dias ou minutos quer estudar por semana.</p>
            <button class="btn secundario" onClick={() => setEditandoMeta(true)}>
              Definir meta da semana
            </button>
          </>
        )}
      </section>

      {painel.vazio ? (
        <section class="bloco">
          <p class="dica painel-dica">Nenhuma resposta {filtro.periodo === 'tudo' ? 'neste baralho' : 'neste período'}.</p>
        </section>
      ) : (
        <>
          {/* 2 · Ritmo */}
          <section class="bloco painel-bloco" aria-labelledby="t-ritmo">
            <div class="painel-topo">
              <h2 id="t-ritmo">Ritmo</h2>
              {comTempo && (
                <div class="segmentado mini" role="group" aria-label="Mostrar">
                  <button class={ver === 'respostas' ? 'ativo' : ''} aria-pressed={ver === 'respostas'} onClick={() => setVer('respostas')}>
                    Respostas
                  </button>
                  <button class={ver === 'tempo' ? 'ativo' : ''} aria-pressed={ver === 'tempo'} onClick={() => setVer('tempo')}>
                    Tempo
                  </button>
                </div>
              )}
            </div>
            <dl class="painel-numeros">
              <div>
                <dt>dias</dt>
                <dd>{painel.ritmo.dias}</dd>
              </div>
              <div>
                <dt>respostas</dt>
                <dd>{painel.ritmo.respostas.toLocaleString('pt-BR')}</dd>
              </div>
              {comTempo && (
                <div>
                  <dt>de estudo</dt>
                  <dd>{textoMinutos(painel.ritmo.minutos!)}</dd>
                </div>
              )}
            </dl>
            <Barras barras={painel.ritmo.barras} ver={comTempo ? ver : 'respostas'} />
            {painel.medindoDesde ? (
              painel.medindoDesde > diaLocalInicio(filtro.periodo, hoje) && <p class="dica painel-dica">O tempo de estudo é contado desde {ddmmDe(painel.medindoDesde)}.</p>
            ) : (
              <p class="dica painel-dica">O tempo de estudo começa a ser contado na próxima sessão.</p>
            )}
          </section>

          {/* 3 · Acertos */}
          <section class="bloco painel-bloco" aria-labelledby="t-acertos">
            <h2 id="t-acertos">Acertos</h2>
            <p class="painel-numero">
              {pct(painel.acertos.taxa)}
              {painel.acertos.diferenca !== null && painel.acertos.diferenca !== 0 && (
                <span class={`painel-variacao ${painel.acertos.diferenca > 0 ? 'sobe' : 'desce'}`}>
                  {painel.acertos.diferenca > 0 ? '↑' : '↓'} {plural(Math.abs(painel.acertos.diferenca), 'ponto', 'pontos')}
                </span>
              )}
            </p>
            <p class="dica painel-dica">
              {plural(painel.acertos.erros, 'erro', 'erros')} · {painel.acertos.chutes} no chute
              {painel.acertos.diferenca !== null && ` · comparado aos ${filtro.periodo} dias anteriores`}
            </p>
          </section>

          {/* 4 · Temas */}
          {painel.temas.length > 0 && (
            <section class="bloco painel-bloco" aria-labelledby="t-temas">
              <h2 id="t-temas">Temas que você mais estuda</h2>
              <ul class="painel-temas">
                {temas.map((t) => (
                  <li>
                    <div class="painel-tema-linha">
                      <span class="painel-tema-nome">
                        {t.nome}
                        {!baralho && ativosBaralhos.length > 1 && <small> · {nomeBaralho(t.baralho)}</small>}
                      </span>
                      <span class="painel-tema-num">
                        {t.respostas} · {pct(t.taxa)}
                      </span>
                    </div>
                    <span class="barra fina" aria-hidden="true">
                      <span style={{ width: `${(100 * t.respostas) / maxTema}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
              <p class="dica painel-dica">Respostas · acerto.</p>
              {painel.temas.length > 5 && (
                <button class="link" onClick={() => setTodosTemas(!todosTemas)}>
                  {todosTemas ? 'Mostrar menos' : `Ver todos (${painel.temas.length})`}
                </button>
              )}
            </section>
          )}

          {/* 5 · Onde você mais erra */}
          {painel.fracos.length > 0 && (
            <section class="bloco painel-bloco" aria-labelledby="t-fracos">
              <h2 id="t-fracos">Onde você mais erra</h2>
              <ul class="painel-fracos">
                {painel.fracos.map((t) => (
                  <li>
                    <span>
                      <strong>{t.nome}</strong>
                      <small>
                        {pct(t.taxa)} de acerto em {t.respostas} respostas
                      </small>
                    </span>
                    <button class="btn terciario compacto" onClick={() => estudarTema(t)}>
                      Estudar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* 6 · Domínio */}
      {painel.dominio.length > 0 && (
        <section class="bloco painel-bloco" aria-labelledby="t-dominio">
          <h2 id="t-dominio">Cartões dominados</h2>
          <ul class="painel-temas">
            {painel.dominio.map((b) => (
              <li>
                <div class="painel-tema-linha">
                  <span class="painel-tema-nome">{b.titulo}</span>
                  <span class="painel-tema-num">
                    {b.dominados} de {b.total}
                    {b.ganho !== null && b.ganho !== 0 && <small class={b.ganho > 0 ? 'sobe' : 'desce'}> {b.ganho > 0 ? `+${b.ganho}` : b.ganho}</small>}
                  </span>
                </div>
                <span class="barra fina" role="progressbar" aria-label={`${b.titulo}: ${b.dominados} de ${b.total} dominados`} aria-valuemin={0} aria-valuemax={b.total} aria-valuenow={b.dominados}>
                  <span style={{ width: `${(100 * b.dominados) / b.total}%` }} />
                </span>
              </li>
            ))}
          </ul>
          {painel.dominio.some((b) => b.ganho !== null) && filtro.periodo !== 'tudo' && <p class="dica painel-dica">+N: quanto mudou nos últimos {filtro.periodo} dias.</p>}
        </section>
      )}

      {/* 7 · Metas de sessão */}
      {painel.metas && painel.metas.total > 0 && (
        <section class="bloco painel-bloco" aria-labelledby="t-metas">
          <h2 id="t-metas">Metas das sessões</h2>
          <p class="painel-numero">
            {painel.metas.batidas} de {plural(painel.metas.total, 'sessão', 'sessões')}
          </p>
          <p class="dica painel-dica">bateram a meta de acertos ou de tempo (o modo Livre não tem meta).</p>
        </section>
      )}

      {/* 8 · Ofensiva e conquistas (gerais) */}
      <section class="bloco painel-bloco" aria-labelledby="t-ofensiva">
        <h2 id="t-ofensiva">Ofensiva e conquistas</h2>
        <dl class="painel-numeros">
          <div>
            <dt>dias seguidos</dt>
            <dd>{sequencia(dados.ofensiva, hoje)}</dd>
          </div>
          <div>
            <dt>maior sequência</dt>
            <dd>{painel.ofensiva.maior}</dd>
          </div>
          <div>
            <dt>{dados.ofensiva.folgas === 1 ? 'folga guardada' : 'folgas guardadas'}</dt>
            <dd>{dados.ofensiva.folgas}</dd>
          </div>
        </dl>
        {dados.conquistas.length > 0 && (
          <ul class="painel-conquistas" aria-label="Conquistas">
            {dados.conquistas.map((m) => (
              <li>{m.frase}</li>
            ))}
          </ul>
        )}
      </section>

      {editandoMeta && (
        <FolhaMeta
          atual={dados.meta}
          fechar={() => setEditandoMeta(false)}
          salvar={async (m) => {
            await gravarMetaSemana(m)
            evento('meta_semana_definida', m ? { tipo: m.tipo, n: m.n } : { tipo: 'nenhuma' })
            setEditandoMeta(false)
            carregar()
          }}
        />
      )}
    </main>
  )
}

/** Primeiro dia que o período mostra (para saber se o tempo começou a contar no meio dele). */
function diaLocalInicio(periodo: Periodo, hoje: string): string {
  if (periodo === 'tudo') return '0000-00-00'
  const [a, m, d] = hoje.split('-').map(Number)
  return diaLocal(new Date(a, m - 1, d - (periodo === '7' ? 6 : 29), 12).getTime())
}

function Barras({ barras, ver }: { barras: Barra[]; ver: 'respostas' | 'tempo' }) {
  const valor = (b: Barra) => (ver === 'tempo' ? b.minutos : b.respostas)
  const max = Math.max(1, ...barras.map(valor))
  return (
    <ol class="painel-barras" aria-label={ver === 'tempo' ? 'Minutos de estudo' : 'Respostas'}>
      {barras.map((b) => (
        <li class={b.atual ? 'atual' : ''} aria-label={`${b.titulo}: ${ver === 'tempo' ? textoMinutos(valor(b)) : plural(valor(b), 'resposta', 'respostas')}`}>
          <span class="painel-coluna" aria-hidden="true">
            <span style={{ height: `${valor(b) ? Math.max(4, (100 * valor(b)) / max) : 0}%` }} />
          </span>
          <span class="painel-rotulo" aria-hidden="true">
            {b.rotulo}
          </span>
        </li>
      ))}
    </ol>
  )
}

function FolhaMeta({ atual, fechar, salvar }: { atual: MetaSemana | null; fechar: () => void; salvar: (m: MetaSemana | null) => void }) {
  const [tipo, setTipo] = useState<MetaSemana['tipo']>(atual?.tipo ?? 'dias')
  const opcoes = tipo === 'dias' ? OPCOES_DIAS : OPCOES_MINUTOS
  const [n, setN] = useState(atual?.n ?? 5)
  const escolhido = opcoes.includes(n) ? n : opcoes[1]
  return (
    <>
      <div class="folha-fundo" aria-hidden="true" onClick={fechar} />
      <div class="folha" role="dialog" aria-modal="true" aria-labelledby="titulo-meta-semana">
        <span class="folha-alca" aria-hidden="true">
          <span />
        </span>
        <h2 id="titulo-meta-semana" class="folha-titulo">
          Meta da semana
        </h2>
        <div class="folha-corpo">
          <div class="segmentado" role="group" aria-label="Medir por">
            <button class={tipo === 'dias' ? 'ativo' : ''} aria-pressed={tipo === 'dias'} onClick={() => setTipo('dias')}>
              Dias
            </button>
            <button class={tipo === 'minutos' ? 'ativo' : ''} aria-pressed={tipo === 'minutos'} onClick={() => setTipo('minutos')}>
              Minutos
            </button>
          </div>
          <div class="segmentado" role="group" aria-label={tipo === 'dias' ? 'Dias por semana' : 'Minutos por semana'}>
            {opcoes.map((o) => (
              <button class={o === escolhido ? 'ativo' : ''} aria-pressed={o === escolhido} onClick={() => setN(o)}>
                {tipo === 'dias' ? o : textoMinutos(o)}
              </button>
            ))}
          </div>
          <p class="dica">{tipo === 'dias' ? 'Dias com pelo menos uma sessão concluída, de domingo a sábado.' : 'Tempo de estudo das sessões, de domingo a sábado.'}</p>
        </div>
        <div class="folha-acoes">
          <button class="btn principal" onClick={() => salvar({ tipo, n: escolhido })}>
            Salvar meta
          </button>
          {atual && (
            <button class="btn terciario" onClick={() => salvar(null)}>
              Sem meta
            </button>
          )}
        </div>
      </div>
    </>
  )
}
