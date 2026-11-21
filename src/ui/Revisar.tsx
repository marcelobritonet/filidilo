import { formasAceitas } from '../core/lacunas'
import { useState } from 'preact/hooks'
import { formatar, preencher, sortear } from '../core/calc'
import type { Baralho, Cartao } from '../core/types'
import type { Navegacao } from './App'
import { conteudoCartao } from './enviar'
import { EnviarModal } from './EnviarModal'
import { DesafiarModal } from './Desafio'
import { podeDesafiar } from '../core/artes'
import { nomeTema } from './estado'
import { Tex } from './Tex'

/** Lista dos cartões do baralho: escrever, colar lista, editar e enviar. */
export function Revisar({ baralho, nav }: { baralho: Baralho; nav: Navegacao }) {
  const [tema, setTema] = useState('')
  const lista = baralho.cartoes.filter((c) => !tema || c.tema === tema)

  const [enviando, setEnviando] = useState<Cartao | null>(null)
  const enviar = (c: Cartao) => setEnviando(c)
  const [desafiando, setDesafiando] = useState<Cartao | null>(null)

  return (
    <main class="tela revisar">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Voltar" onClick={nav.voltar}>
          ←
        </button>
        <h1 class="titulo-barra">Cartões</h1>
        <span />
      </header>
      <div class="linha">
        <button class="btn principal" onClick={() => nav.ir({ nome: 'cartao', id: baralho.id, tema: tema || undefined })}>
          Escrever
        </button>
        <button class="btn secundario" onClick={() => nav.ir({ nome: 'colar', id: baralho.id })}>
          Colar lista
        </button>
      </div>
      {baralho.temas.length > 1 && (
        <label class="campo">
          Tema
          <select value={tema} onChange={(e) => setTema((e.target as HTMLSelectElement).value)}>
            <option value="">Todos ({baralho.cartoes.length})</option>
            {baralho.temas
              .filter((t) => baralho.cartoes.some((c) => c.tema === t.id))
              .map((t) => (
                <option value={t.id}>
                  {t.nome} ({baralho.cartoes.filter((c) => c.tema === t.id).length})
                </option>
              ))}
          </select>
        </label>
      )}
      <ul class="lista-revisao">
        {lista.map((c) => (
          <li class="item">
            <div class="cab">
              <span class="tema-chip">{nomeTema(baralho, c.tema)}</span>
            </div>
            <Conteudo c={c} />
            {c.fonte && (
              <p class="fonte">
                Fonte: {c.fonte.apostila}
                {c.fonte.pagina !== undefined && `, p. ${c.fonte.pagina}`}
              </p>
            )}
            <div class="linha">
              <button class="btn secundario compacto" onClick={() => nav.ir({ nome: 'cartao', id: baralho.id, cartaoId: c.id })}>
                Editar
              </button>
              <button class="btn secundario compacto" onClick={() => enviar(c)}>
                Enviar
              </button>
            </div>
          </li>
        ))}
        {!lista.length && <p class="dica centro">Nenhum cartão.</p>}
      </ul>
      {enviando && <EnviarModal conteudo={conteudoCartao(baralho, enviando)} onde="lista" avisar={(texto) => nav.avisar({ texto })} fechar={() => setEnviando(null)} desafiar={podeDesafiar(enviando) ? () => { setDesafiando(enviando); setEnviando(null) } : undefined} />}
      {desafiando && <DesafiarModal baralho={baralho} cartao={desafiando} avisar={(texto) => nav.avisar({ texto })} fechar={() => setDesafiando(null)} />}
    </main>
  )
}

/** Nos níveis expert e extremo a IA erra mais: lembra de conferir os cartões antes de salvar. */
export function AvisoNivelAlto({ nivel }: { nivel?: string }) {
  if (nivel !== 'expert' && nivel !== 'extremo') return null
  return (
    <p class="aviso-nivel" role="note">
      Nesse nível a IA erra mais. Confira cada cartão e desmarque o que parecer errado. Se achar um erro depois, use “Corrigir cartão” durante o estudo.
    </p>
  )
}

export function Conteudo({ c }: { c: Cartao }) {
  switch (c.tipo) {
    case 'lacunas':
      return (
        <>
          <Tex class="frente" texto={c.frente.replace(/____/g, '______')} />
          <Tex class="verso" texto={`→ ${c.respostas.map((r) => formasAceitas(r)[0]).join(', ')}`} />
          {c.explicacao && <Tex class="explicacao" texto={c.explicacao} />}
        </>
      )
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
            {c.outrasFormas?.map((o) => (
              <li class="certa">
                {'✔ '}
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
