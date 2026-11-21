import { useState } from 'preact/hooks'
import { pecaDesafio } from '../core/artes'
import { arquivoDoBaralho, arquivoDosCartoes } from '../core/compartilhar'
import type { Nota } from '../core/db'
import { criarLink, linkLigado, type LinkCriado } from '../core/link'
import { NIVEIS_COM_ALTERNATIVAS } from '../core/lacunas'
import { evento } from '../core/telemetria'
import type { Baralho, Cartao } from '../core/types'
import { CompartilharImagem } from './CompartilharImagem'
import { Confete } from './Confete'
import { CartaoView, respostasDoBaralho } from './Sessao'

/**
 * Desafiar amigos com um cartão: gera um link de 7 dias (com o cartão ou o baralho inteiro)
 * e abre a prévia da imagem com a pergunta e o QR code.
 */
export function DesafiarModal({ baralho, cartao, avisar, fechar }: { baralho: Baralho; cartao: Cartao; avisar?: (texto: string) => void; fechar: () => void }) {
  const [junto, setJunto] = useState<'cartao' | 'baralho'>('cartao')
  const [link, setLink] = useState<LinkCriado | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState(linkLigado() ? '' : 'O desafio precisa do envio por link, que não está ligado nesta versão.')

  const gerar = async () => {
    if (!navigator.onLine) return setErro('Sem internet para gerar o desafio.')
    setOcupado(true)
    setErro('')
    try {
      const { texto } = junto === 'baralho' ? arquivoDoBaralho(baralho, undefined, cartao.id) : arquivoDosCartoes(baralho, [cartao], cartao.id)
      setLink(await criarLink(texto, fetch, '7d'))
      evento('desafio_enviado', { junto, tipo: cartao.tipo })
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (link)
    return (
      <CompartilharImagem
        opcoes={[{ rotulo: 'Desafio', usaNome: true, peca: (comNome) => pecaDesafio(cartao, { baralho: baralho.titulo, comNome, url: link.url }) }]}
        onde="desafio"
        avisar={avisar}
        fechar={fechar}
      />
    )

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-desafiar">
        <h2 id="titulo-desafiar">Desafiar amigos</h2>
        <p class="dica">Uma imagem com a pergunta (sem a resposta) para o story ou o grupo. Quem abrir o link responde no tatino. e pode salvar.</p>
        <fieldset class="opcoes-desafio">
          <legend>Junto vai</legend>
          <label class="opcao-check">
            <input type="radio" name="junto" checked={junto === 'cartao'} onChange={() => setJunto('cartao')} />
            <span class="textos">
              <strong>Só este cartão</strong>
            </span>
          </label>
          <label class="opcao-check">
            <input type="radio" name="junto" checked={junto === 'baralho'} onChange={() => setJunto('baralho')} />
            <span class="textos">
              <strong>O baralho inteiro</strong>
              <small>
                “{baralho.titulo}”, {baralho.cartoes.length} {baralho.cartoes.length === 1 ? 'cartão' : 'cartões'}, sem o seu progresso
              </small>
            </span>
          </label>
        </fieldset>
        <p class="dica">O link vale 7 dias.</p>
        {erro && (
          <p class="resultado erro" role="alert">
            {erro}
          </p>
        )}
        <button class="btn principal" disabled={ocupado || !linkLigado()} onClick={gerar}>
          {ocupado ? 'Gerando o desafio…' : 'Gerar o desafio'}
        </button>
        <button class="btn terciario" onClick={fechar}>
          Fechar
        </button>
      </div>
    </div>
  )
}

/** Quem abriu o link de um desafio: responde o cartão primeiro e depois decide se salva. */
export function DesafioRecebido({ cartao, baralho, origem, salvarRotulo, salvar, fechar }: { cartao: Cartao; baralho: Baralho; origem: string; salvarRotulo: string; salvar: () => void; fechar: () => void }) {
  const [acertou, setAcertou] = useState<boolean | null>(null)
  const avaliar = (nota: Nota, chute = false) => {
    const ok = nota !== 1 && !chute
    evento('desafio_respondido', { acertou: ok, tipo: cartao.tipo })
    setAcertou(ok)
    window.scrollTo(0, 0)
  }
  const facil = !!baralho.objetivo?.nivel && (NIVEIS_COM_ALTERNATIVAS as readonly string[]).includes(baralho.objetivo.nivel)

  return (
    <main class="tela sessao desafio">
      <header class="barra-sessao">
        <button class="fechar" aria-label="Fechar o desafio" onClick={fechar}>
          ←
        </button>
        <span class="titulo-barra">Desafio</span>
        <span />
      </header>
      {acertou === null ? (
        <>
          <p class="dica centro">Te desafiaram com um cartão de “{origem}”. Você sabe?</p>
          <CartaoView cartao={cartao} acoes={{ avaliar }} facil={facil} distratores={respostasDoBaralho(baralho)} />
        </>
      ) : (
        <section class={`fim ${acertou ? 'comemorando' : ''}`}>
          {acertou && <Confete />}
          <h2>{acertou ? 'Acertou! 🎉' : 'Não foi dessa vez'}</h2>
          <p>{acertou ? 'Mandou bem no desafio.' : 'Agora você já sabe a resposta. Que tal treinar?'}</p>
          <button
            class="btn principal"
            onClick={() => {
              evento('desafio_salvo', { o_que: salvarRotulo.includes('baralho') ? 'baralho' : 'cartao' })
              salvar()
            }}
          >
            {salvarRotulo}
          </button>
          <button class="btn terciario" onClick={fechar}>
            Agora não
          </button>
        </section>
      )}
    </main>
  )
}
