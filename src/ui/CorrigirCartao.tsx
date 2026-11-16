import { evento } from '../core/telemetria'
import { useMemo, useState } from 'preact/hooks'
import { gravarCartao } from '../core/cartoes'
import { lerCartaoCorrigido, montarPedidoCorrecao } from '../core/ia/corrigir'
import type { Baralho, Cartao } from '../core/types'
import { AbrirIA } from './AbrirIA'
import { Conteudo } from './Revisar'


/** Janela para corrigir um cartão com ajuda da IA: pedir, colar a resposta, comparar e salvar. */
export function CorrigirCartao({ baralho, cartao, aoSalvar, fechar }: { baralho: Baralho; cartao: Cartao; aoSalvar: (c: Cartao, b: Baralho) => void; fechar: () => void }) {
  const [problema, setProblema] = useState('')
  const [copiado, setCopiado] = useState<'' | 'ok' | 'erro'>('')
  const [resposta, setResposta] = useState('')
  const [lido, setLido] = useState<{ cartao: Cartao; erros: string[] } | null>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const pedido = useMemo(() => montarPedidoCorrecao(baralho, cartao, problema), [baralho, cartao, problema])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pedido)
      setCopiado('ok')
    } catch {
      setCopiado('erro')
    }
  }

  const ler = () => {
    setErro('')
    try {
      setLido(lerCartaoCorrigido(resposta, baralho, cartao))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  const salvar = async () => {
    if (!lido || lido.erros.length) return
    setSalvando(true)
    evento('corrigir_salvo', { tipo: lido.cartao.tipo })
    const b = await gravarCartao(baralho, lido.cartao)
    aoSalvar(lido.cartao, b)
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal corrigir" role="dialog" aria-modal="true" aria-labelledby="titulo-corrigir">
        <h2 id="titulo-corrigir">Corrigir cartão</h2>

        {!lido ? (
          <>
            <label class="campo">
              O que está errado? (opcional)
              <textarea rows={2} value={problema} placeholder="A resposta certa é…" onInput={(e) => setProblema((e.target as HTMLTextAreaElement).value)} />
            </label>
            <p class="dica">Copie o pedido e cole na IA. Depois cole a resposta abaixo.</p>
            <button class="btn principal" onClick={copiar}>
              {copiado === 'ok' ? '✓ Copiado' : 'Copiar pedido'}
            </button>
            <AbrirIA />
            {copiado === 'erro' && <textarea class="instrucao" rows={6} readOnly value={pedido} aria-label="Pedido para copiar" />}
            <label class="campo">
              Resposta da IA
              <textarea rows={4} value={resposta} placeholder="Cole aqui" onInput={(e) => setResposta((e.target as HTMLTextAreaElement).value)} />
            </label>
            {erro && (
              <p class="resultado erro" role="alert">
                ✕ {erro}
              </p>
            )}
            <button class="btn principal" disabled={!resposta.trim()} onClick={ler}>
              Ver correção
            </button>
          </>
        ) : (
          <>
            <div class="comparar">
              <p class="rotulo">Antes</p>
              <div class="item">
                <Conteudo c={cartao} />
              </div>
              <p class="rotulo">Depois</p>
              <div class="item ok">
                <Conteudo c={lido.cartao} />
              </div>
            </div>
            {lido.erros.length > 0 && (
              <ul class="problemas" role="alert">
                {lido.erros.map((e) => (
                  <li>✕ {e}</li>
                ))}
              </ul>
            )}
            <button class="btn principal" disabled={!!lido.erros.length || salvando} onClick={salvar}>
              Salvar correção
            </button>
            <button class="btn secundario" onClick={() => setLido(null)}>
              Voltar
            </button>
          </>
        )}
        <button class="btn terciario" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
