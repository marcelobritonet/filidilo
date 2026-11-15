import { useEffect, useMemo, useState } from 'preact/hooks'
import { chave, dominado, vencido } from '../core/srs'
import type { Filtro } from '../core/fila'
import type { Tela } from './App'
import { baralho, diasAte, useEstados } from './estado'

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
}

export function Inicio({ ir, versao }: { ir: (t: Tela) => void; versao: number }) {
  const estados = useEstados(versao)
  const [temas, setTemas] = useState<string[]>([])
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [instalar, setInstalar] = useState<EventoInstalar | null>(null)

  useEffect(() => {
    const f = (e: Event) => {
      e.preventDefault()
      setInstalar(e as EventoInstalar)
    }
    window.addEventListener('beforeinstallprompt', f)
    return () => window.removeEventListener('beforeinstallprompt', f)
  }, [])

  const porTema = useMemo(() => {
    const m = new Map<string, { total: number; dominados: number; vistos: number }>()
    for (const t of baralho.temas) m.set(t.id, { total: 0, dominados: 0, vistos: 0 })
    for (const c of baralho.cartoes) {
      const r = m.get(c.tema)!
      const e = estados?.get(chave(baralho.id, c.id))
      r.total++
      if (e) r.vistos++
      if (dominado(e)) r.dominados++
    }
    return m
  }, [estados])

  const paraHoje = useMemo(
    () => (estados ? baralho.cartoes.filter((c) => estados.has(chave(baralho.id, c.id)) && vencido(estados.get(chave(baralho.id, c.id)))).length : 0),
    [estados],
  )
  const temCalculo = baralho.cartoes.some((c) => c.tipo === 'calculo')
  const total = baralho.cartoes.length
  const dominadosTotal = [...porTema.values()].reduce((s, r) => s + r.dominados, 0)
  const dias = baralho.prova ? diasAte(baralho.prova) : null
  const alternar = (id: string) => setTemas((ts) => (ts.includes(id) ? ts.filter((t) => t !== id) : [...ts, id]))
  const opcoes = { temas, filtro }

  return (
    <main class="tela inicio">
      <header class="topo">
        <h1>Tatino</h1>
        <p class="sub">{baralho.titulo}</p>
        {dias !== null && dias >= 0 && (
          <p class="contagem">{dias === 0 ? 'A prova é hoje. Boa prova!' : dias === 1 ? 'Prova amanhã' : `Faltam ${dias} dias para a prova`}</p>
        )}
      </header>

      {instalar && (
        <button class="btn instalar" onClick={() => instalar.prompt().then(() => setInstalar(null))}>
          📲 Instalar o app no celular
        </button>
      )}

      <section class="cartao-resumo">
        <div class="barra grande" aria-label={`${dominadosTotal} de ${total} cartões dominados`}>
          <div style={{ width: `${(100 * dominadosTotal) / Math.max(total, 1)}%` }} />
        </div>
        <p>
          <strong>{dominadosTotal}</strong> de {total} cartões dominados
        </p>
      </section>

      <section class="acoes">
        <button class="btn principal" onClick={() => ir({ nome: 'sessao', modo: 'prova', opcoes })}>
          🎯 Modo prova
          <small>20 cartões, começando pelo que você mais precisa</small>
        </button>
        <button class="btn" onClick={() => ir({ nome: 'sessao', modo: 'espacada', opcoes })}>
          🔁 Revisão espaçada
          <small>{paraHoje ? `${paraHoje} para revisar hoje + novos` : 'Cartões novos'}</small>
        </button>
        {temCalculo && (
          <button class="btn" onClick={() => ir({ nome: 'sessao', modo: 'calculo', opcoes: { temas, filtro: 'calculo' } })}>
            🧮 Exercícios de cálculo
            <small>Números novos a cada vez, com resolução passo a passo</small>
          </button>
        )}
      </section>

      <section>
        <h2>Temas {temas.length > 0 && <button class="link" onClick={() => setTemas([])}>limpar seleção</button>}</h2>
        <p class="dica">Toque nos temas para estudar só eles. Sem seleção, entram todos.</p>
        {temCalculo && (
          <div class="segmentado" role="radiogroup" aria-label="Tipo de cartão">
            {(['tudo', 'teoria', 'calculo'] as Filtro[]).map((f) => (
              <button role="radio" aria-checked={filtro === f} class={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
                {f === 'tudo' ? 'Tudo' : f === 'teoria' ? 'Só teoria' : 'Só cálculo'}
              </button>
            ))}
          </div>
        )}
        <ul class="temas">
          {baralho.temas.map((t) => {
            const r = porTema.get(t.id)!
            if (!r.total) return null
            const sel = temas.includes(t.id)
            return (
              <li>
                <button class={`tema ${sel ? 'sel' : ''}`} aria-pressed={sel} onClick={() => alternar(t.id)}>
                  <span class="nome">
                    {sel ? '☑' : '☐'} {t.nome} {t.prioritario && <span class="selo">cai na prova</span>}
                  </span>
                  <span class="barra">
                    <span style={{ width: `${(100 * r.dominados) / r.total}%` }} />
                  </span>
                  <span class="num">
                    {r.dominados}/{r.total}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <nav class="rodape">
        <button class="btn secundario" onClick={() => ir({ nome: 'revisar' })}>
          📋 Revisar conteúdo
        </button>
        <button class="btn secundario" onClick={() => ir({ nome: 'backup' })}>
          💾 Backup e reportes
        </button>
      </nav>
      <p class="versao">Baralho v{baralho.versao} · funciona sem internet</p>
    </main>
  )
}
