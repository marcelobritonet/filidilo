import { useMemo, useState } from 'preact/hooks'
import { adicionarCartoes, lerLista } from '../core/cartoes'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'

/** Cola várias linhas "Pergunta — Resposta" e cria cartões de uma vez. */
export function ColarLista({ baralho, nav }: { baralho: Baralho; nav: Navegacao }) {
  const [texto, setTexto] = useState('')
  const [tema, setTema] = useState(baralho.temas[0]?.id ?? 'geral')
  const linhas = useMemo(() => lerLista(texto, tema), [texto, tema])
  const validos = linhas.filter((l) => l.cartao)
  const invalidos = linhas.filter((l) => l.erro)

  const adicionar = async () => {
    await adicionarCartoes(baralho, validos.map((l) => l.cartao!))
    nav.mudou()
    nav.avisar({ texto: `${validos.length} cartões adicionados.` })
    nav.voltar()
  }

  return (
    <main class="tela colar">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>←</button>
        <span>Colar lista</span>
        <span />
      </header>
      <p class="dica">
        Uma pergunta por linha, separada da resposta por <strong>—</strong>, <strong>;</strong> ou <strong>tab</strong> (colunas de planilha). Ex.:
        <br />
        <code>Cb — coeficiente de bloco</code>
      </p>
      <section class="bloco">
        <label class="campo">
          Tema dos cartões
          <select value={tema} onChange={(e) => setTema((e.target as HTMLSelectElement).value)}>
            {baralho.temas.map((t) => (
              <option value={t.id}>{t.nome}</option>
            ))}
          </select>
        </label>
        <textarea rows={10} value={texto} placeholder="Cole ou escreva aqui…" onInput={(e) => setTexto((e.target as HTMLTextAreaElement).value)} />
      </section>

      {linhas.length > 0 && (
        <section class="bloco">
          <p>
            <strong>{validos.length}</strong> cartões prontos
            {invalidos.length > 0 && <>, {invalidos.length} linhas com problema</>}
          </p>
          {invalidos.length > 0 && (
            <ul class="problemas">
              {invalidos.map((l) => (
                <li>
                  ⚠ Linha {l.linha}: {l.erro} — <em>{l.texto.slice(0, 60)}</em>
                </li>
              ))}
            </ul>
          )}
          <ul class="previa-lista">
            {validos.slice(0, 5).map((l) => (
              <li>
                <strong>{l.cartao!.frente}</strong> → {l.cartao!.tipo === 'conceito' && l.cartao!.verso}
              </li>
            ))}
            {validos.length > 5 && <li class="dica">… e mais {validos.length - 5}</li>}
          </ul>
        </section>
      )}

      <button class="btn principal" disabled={!validos.length} onClick={adicionar}>
        Adicionar {validos.length || ''} cartões
      </button>
    </main>
  )
}
