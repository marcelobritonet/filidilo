import { useEffect, useMemo, useState } from 'preact/hooks'
import { formatar, preencher, sortear } from '../core/calc'
import { db, type Marca, type Reporte } from '../core/db'
import { chave } from '../core/srs'
import type { Baralho, Cartao } from '../core/types'
import { nomeTema } from './estado'
import { Tex } from './Tex'

type FiltroStatus = 'todos' | 'pendentes' | 'reportados' | 'erro' | 'ok'

export function Revisar({ baralho, sair }: { baralho: Baralho; sair: () => void }) {
  const [tema, setTema] = useState(baralho.temas[0]?.id ?? '')
  const [status, setStatus] = useState<FiltroStatus>('todos')
  const [marcas, setMarcas] = useState<Map<string, Marca>>(new Map())
  const [reportes, setReportes] = useState<Map<string, Reporte[]>>(new Map())
  const [v, setV] = useState(0)

  useEffect(() => {
    db.marcas.toArray().then((l) => setMarcas(new Map(l.map((m) => [m.cartao, m]))))
    db.reportes.toArray().then((l) => {
      const m = new Map<string, Reporte[]>()
      for (const r of l) m.set(r.cartao, [...(m.get(r.cartao) ?? []), r])
      setReportes(m)
    })
  }, [v])

  const lista = useMemo(
    () =>
      baralho.cartoes.filter((c) => {
        const k = chave(baralho.id, c.id)
        if (tema && c.tema !== tema) return false
        const m = marcas.get(k)
        switch (status) {
          case 'pendentes': return !m
          case 'reportados': return reportes.has(k)
          case 'erro': return m && m.status !== 'ok'
          case 'ok': return m?.status === 'ok'
          default: return true
        }
      }),
    [baralho, tema, status, marcas, reportes],
  )

  const revisados = baralho.cartoes.filter((c) => c.tema === tema && marcas.has(chave(baralho.id, c.id))).length
  const doTema = baralho.cartoes.filter((c) => c.tema === tema).length

  return (
    <main class="tela revisar">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={sair}>
          ←
        </button>
        <span>Revisar conteúdo</span>
        <span />
      </header>
      <p class="dica">Confira cada cartão com a apostila e marque ✓ certo, ⚠ errado ou 📝 com uma observação.</p>
      <label class="campo">
        Tema
        <select value={tema} onChange={(e) => setTema((e.target as HTMLSelectElement).value)}>
          {baralho.temas
            .filter((t) => baralho.cartoes.some((c) => c.tema === t.id))
            .map((t) => (
              <option value={t.id}>{t.nome}</option>
            ))}
          <option value="">Todos os temas</option>
        </select>
      </label>
      <div class="chips">
        {(['todos', 'pendentes', 'reportados', 'erro', 'ok'] as FiltroStatus[]).map((s) => (
          <button class={`chip ${s === status ? 'ativo' : ''}`} aria-pressed={s === status} onClick={() => setStatus(s)}>
            {{ todos: 'Todos', pendentes: 'Não revisados', reportados: 'Reportados', erro: 'Com problema', ok: 'Certos' }[s]}
          </button>
        ))}
      </div>
      {tema && (
        <p class="dica">
          {revisados} de {doTema} revisados neste tema
        </p>
      )}
      <ul class="lista-revisao">
        {lista.map((c) => (
          <ItemRevisao key={c.id} baralho={baralho} c={c} marca={marcas.get(chave(baralho.id, c.id))} reps={reportes.get(chave(baralho.id, c.id)) ?? []} mudou={() => setV(v + 1)} />
        ))}
        {!lista.length && <p class="dica centro">Nenhum cartão com esse filtro.</p>}
      </ul>
    </main>
  )
}

function ItemRevisao({ baralho, c, marca, reps, mudou }: { baralho: Baralho; c: Cartao; marca?: Marca; reps: Reporte[]; mudou: () => void }) {
  const [nota, setNota] = useState(marca?.nota ?? '')
  const [editando, setEditando] = useState(false)
  const k = chave(baralho.id, c.id)
  const marcar = async (st: Marca['status']) => {
    if (st !== 'ok' && !editando && !nota) {
      setEditando(true)
      if (st === 'nota') return
    }
    await db.marcas.put({ cartao: k, status: st, nota: nota.trim(), data: Date.now() })
    if (st === 'ok') setEditando(false)
    mudou()
  }
  return (
    <li class={`item ${marca?.status ?? ''}`}>
      <div class="cab">
        <code>{c.id}</code>
        <span class="tema-chip">{nomeTema(baralho, c.tema)}</span>
        <span class="tipo">{{ conceito: 'conceito', vf: 'V/F', associacao: 'alternativas', calculo: 'cálculo' }[c.tipo]}</span>
      </div>
      <Conteudo c={c} />
      {c.fonte && (
        <p class="fonte">
          📄 {c.fonte.apostila}
          {c.fonte.pagina !== undefined && `, p. ${c.fonte.pagina}`}
        </p>
      )}
      {reps.map((r) => (
        <p class="reporte">
          ⚠ Reportado: {r.motivo}
          {r.texto && ` — ${r.texto}`}
        </p>
      ))}
      {(editando || marca?.nota) && (
        <textarea rows={2} placeholder="Observação" value={nota} onInput={(e) => setNota((e.target as HTMLTextAreaElement).value)} onBlur={() => marca && marca.status !== 'ok' && marcar(marca.status)} />
      )}
      <div class="marcas">
        <button class={`chip ${marca?.status === 'ok' ? 'ativo ok' : ''}`} onClick={() => marcar('ok')}>
          ✓ Certo
        </button>
        <button class={`chip ${marca?.status === 'erro' ? 'ativo erro' : ''}`} onClick={() => marcar('erro')}>
          ⚠ Errado
        </button>
        <button class={`chip ${marca?.status === 'nota' ? 'ativo' : ''}`} onClick={() => marcar('nota')}>
          📝 Observação
        </button>
      </div>
    </li>
  )
}

function Conteudo({ c }: { c: Cartao }) {
  switch (c.tipo) {
    case 'conceito':
      return (
        <>
          <Tex class="frente" texto={c.frente} />
          <Tex class="verso" texto={`→ ${c.verso}`} />
          {c.explicacao && <Tex class="explicacao" texto={c.explicacao} />}
        </>
      )
    case 'vf':
      return (
        <>
          <Tex class="frente" texto={c.frente} />
          <p class="verso">
            → <strong>{c.resposta ? 'Verdadeiro' : 'Falso'}</strong>
          </p>
          {c.explicacao && <Tex class="explicacao" texto={c.explicacao} />}
        </>
      )
    case 'associacao':
      return (
        <>
          <Tex class="frente" texto={c.frente} />
          <ul class="alternativas">
            {c.opcoes.map((o, i) => (
              <li class={i === c.correta ? 'certa' : ''}>
                {i === c.correta ? '✔ ' : '· '}
                <Tex texto={o} />
              </li>
            ))}
          </ul>
          {c.explicacao && <Tex class="explicacao" texto={c.explicacao} />}
        </>
      )
    case 'calculo': {
      const s = sortear(c)
      return (
        <>
          <p class="frente">
            <strong>{c.titulo}</strong> (exemplo sorteado)
          </p>
          <Tex texto={preencher(c.enunciado, s)} />
          <ol class="etapas mini">
            {c.etapas.map((et, i) => (
              <li>
                <Tex texto={preencher(et.pergunta, s)} /> →{' '}
                <strong>{et.opcoes ? et.opcoes[s.respostas[i]] : `${formatar(s.respostas[i], et.casas ?? 2)} ${et.unidade ?? ''}`}</strong>
                <div class="resolucao">
                  {et.resolucao.map((l) => (
                    <Tex texto={preencher(l, s)} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </>
      )
    }
  }
}
