import { useState } from 'preact/hooks'
import type { Nota } from '../core/db'
import { NIVEIS_COM_ALTERNATIVAS } from '../core/lacunas'
import { evento } from '../core/telemetria'
import type { Baralho, Cartao } from '../core/types'
import { Confete } from './Confete'
import { CartaoView, respostasDoBaralho } from './Sessao'

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
          <h2>{acertou ? 'Acertou!' : 'Não foi dessa vez'}</h2>
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
