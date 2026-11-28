import { formasAceitas } from '../core/lacunas'
import { useState } from 'preact/hooks'
import { formatar, preencher, sortear } from '../core/calc'
import type { Baralho, Cartao } from '../core/types'
import { arquivarCartao, desarquivarCartao, favoritos, marcarFavorito } from '../core/cartoes'
import { evento } from '../core/telemetria'
import type { Navegacao } from './App'
import { conteudoCartao } from './enviar'
import { EnviarModal } from './EnviarModal'
import { nomeTema } from './estado'
import { Tex } from './Tex'
import { IconeFavorito } from './Icone'

/** Lista dos cartões do baralho: escrever, colar lista, editar e enviar. */
const ARQUIVADOS = '__arquivados'
const FAVORITOS = '__favoritos'

export function Revisar({ baralho, nav, arquivados: abrirArquivados }: { baralho: Baralho; nav: Navegacao; arquivados?: boolean }) {
  const nArquivados = baralho.cartoes.filter((c) => c.arquivadoEm).length
  const [escolhido, setTema] = useState(abrirArquivados && nArquivados ? ARQUIVADOS : '')
  // Sem arquivados (desarquivou o último), volta para Todos.
  const nFavoritos = favoritos(baralho).length
  // Sem favoritos, também volta para Todos.
  const tema = (escolhido === ARQUIVADOS && !nArquivados) || (escolhido === FAVORITOS && !nFavoritos) ? '' : escolhido
  const vendoArquivados = tema === ARQUIVADOS
  const ativos = baralho.cartoes.filter((c) => !c.arquivadoEm)
  const lista = vendoArquivados ? baralho.cartoes.filter((c) => c.arquivadoEm) : tema === FAVORITOS ? favoritos(baralho) : ativos.filter((c) => !tema || c.tema === tema)

  const favoritar = async (c: Cartao) => {
    const sim = !c.favoritoEm
    evento('cartao_favoritado', { onde: 'lista', sim })
    await marcarFavorito(baralho, c.id, sim)
    nav.mudou()
  }

  const arquivar = async (c: Cartao) => {
    evento('cartao_arquivado', { onde: 'lista', tipo: c.tipo })
    const b = await arquivarCartao(baralho, c.id)
    nav.mudou()
    nav.avisar({
      texto: 'Cartão arquivado. Ele não volta mais no estudo.',
      desfazer: async () => {
        await desarquivarCartao(b, c.id)
        nav.mudou()
      },
    })
  }
  const desarquivar = async (c: Cartao) => {
    evento('cartao_desarquivado', { onde: 'lista' })
    await desarquivarCartao(baralho, c.id)
    nav.mudou()
    nav.avisar({ texto: 'Cartão de volta ao estudo.' })
  }

  const [enviando, setEnviando] = useState<Cartao | null>(null)
  const enviar = (c: Cartao) => setEnviando(c)

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
      {(baralho.temas.length > 1 || nArquivados > 0 || nFavoritos > 0) && (
        <label class="campo">
          Mostrar
          <select value={tema} onChange={(e) => setTema((e.target as HTMLSelectElement).value)}>
            <option value="">Todos ({ativos.length})</option>
            {nFavoritos > 0 && <option value={FAVORITOS}>Favoritos ({nFavoritos})</option>}
            {baralho.temas.length > 1 &&
              baralho.temas
                .filter((t) => ativos.some((c) => c.tema === t.id))
                .map((t) => (
                  <option value={t.id}>
                    {t.nome} ({ativos.filter((c) => c.tema === t.id).length})
                  </option>
                ))}
            {nArquivados > 0 && <option value={ARQUIVADOS}>Arquivados ({nArquivados})</option>}
          </select>
        </label>
      )}
      {vendoArquivados && <p class="dica">Arquivados não aparecem no estudo nem nas contagens. O progresso deles continua guardado.</p>}
      <ul class="lista-revisao">
        {lista.map((c) => (
          <li class={`item ${c.arquivadoEm ? 'arquivado' : ''}`}>
            <div class="cab">
              <span class="tema-chip">{nomeTema(baralho, c.tema)}</span>
              {c.arquivadoEm && <span class="etiqueta-arquivado">Arquivado</span>}
            </div>
            {!c.arquivadoEm && (
              <button class="icone-btn botao-favorito" aria-pressed={!!c.favoritoEm} aria-label={c.favoritoEm ? 'Tirar dos favoritos' : 'Favoritar'} title={c.favoritoEm ? 'Tirar dos favoritos' : 'Favoritar'} onClick={() => favoritar(c)}>
                <IconeFavorito ligado={!!c.favoritoEm} colado />
              </button>
            )}
            <Conteudo c={c} />
            {c.fonte && (
              <p class="fonte">
                Fonte: {c.fonte.apostila}
                {c.fonte.pagina !== undefined && `, p. ${c.fonte.pagina}`}
              </p>
            )}
            {c.arquivadoEm ? (
              <div class="linha">
                <button class="btn secundario compacto" onClick={() => desarquivar(c)}>
                  Desarquivar
                </button>
                <button class="btn secundario compacto" onClick={() => nav.ir({ nome: 'cartao', id: baralho.id, cartaoId: c.id })}>
                  Editar
                </button>
              </div>
            ) : (
              <div class="linha">
                <button class="btn secundario compacto" onClick={() => nav.ir({ nome: 'cartao', id: baralho.id, cartaoId: c.id })}>
                  Editar
                </button>
                <button class="btn secundario compacto" onClick={() => enviar(c)}>
                  Enviar
                </button>
                <button class="btn secundario compacto" onClick={() => arquivar(c)}>
                  Arquivar
                </button>
              </div>
            )}
          </li>
        ))}
        {!lista.length && <p class="dica centro">Nenhum cartão.</p>}
      </ul>
      {enviando && <EnviarModal conteudo={conteudoCartao(baralho, enviando)} onde="lista" avisar={(texto) => nav.avisar({ texto })} fechar={() => setEnviando(null)} />}
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

/** Outros enunciados da mesma pergunta (o app sorteia um a cada vez). */
function OutrasFrentes({ lista }: { lista?: string[] }) {
  if (!lista?.length) return null
  return (
    <>
      <p class="dica">Também pode aparecer como:</p>
      <ul class="variantes">
        {lista.map((f) => (
          <li>
            <Tex texto={f} />
          </li>
        ))}
      </ul>
    </>
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
          <OutrasFrentes lista={c.outrasFrentes} />
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
          {!!c.variantes?.length && (
            <>
              <p class="dica">Outras afirmações (uma aparece a cada vez):</p>
              <ul class="variantes">
                {c.variantes.map((v) => (
                  <li>
                    <Tex texto={v.frente} /> → <strong>{v.resposta ? 'Verdadeiro' : 'Falso'}</strong>
                    {v.explicacao && <Tex class="explicacao" texto={v.explicacao} />}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )
    case 'associacao':
      return (
        <>
          <Tex class="frente" texto={c.frente} />
          <OutrasFrentes lista={c.outrasFrentes} />
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
    case 'colunas':
      return (
        <>
          <Tex class="frente" texto={c.frente} />
          <OutrasFrentes lista={c.outrasFrentes} />
          <p class="dica">Pares (aparecem 4 de cada vez):</p>
          <ul class="variantes">
            {c.pares.map((p) => (
              <li>
                <Tex texto={p.esquerda} /> → <strong><Tex texto={p.direita} /></strong>
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
