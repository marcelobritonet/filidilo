import { evento } from '../core/telemetria'
import { useState } from 'preact/hooks'
import { criar } from '../core/baralhos'
import { adicionarCartoesRecebidos, aplicar, aplicarSoProgresso, importarComoCopia, type CartoesRecebidos, type PlanoImportacao } from '../core/compartilhar'
import type { Baralho } from '../core/types'
import type { Navegacao } from './App'

/** Resumo do baralho recebido e as opções de importar. */
export function Importar({ plano, nav, fechar }: { plano: PlanoImportacao; nav: Navegacao; fechar: () => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [trazer, setTrazer] = useState(true)
  const { recebido, atual } = plano
  const comProgresso = trazer && plano.estudados > 0
  const mudancas = plano.novos.length + plano.atualizados.length
  // Já tem o baralho igualzinho (ex.: o de exemplo que vem na primeira abertura): não há o que comparar.
  const igual = !!atual && !mudancas && !plano.preservados.length && !plano.temasNovos.length
  const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`

  const concluir = async (fazer: () => Promise<{ id: string; titulo: string }>, msg: string) => {
    setOcupado(true)
    evento('recebido_baralho', { acao: msg.includes('Importado como') ? 'copia' : plano.atual ? 'atualizar' : 'novo', novos: plano.novos.length, atualizados: plano.atualizados.length, progresso: comProgresso })
    const b = await fazer()
    nav.mudou()
    nav.avisar({ texto: msg.replace('{t}', b.titulo) + (comProgresso ? ' Com o progresso.' : '') })
    fechar()
    nav.ir({ nome: 'baralho', id: b.id })
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-importar">
        <h2 id="titulo-importar">{atual && !igual ? 'Atualizar baralho' : 'Baralho recebido'}</h2>
        <p>
          <strong>{recebido.titulo}</strong> · {n(recebido.cartoes.length, 'cartão', 'cartões')}
        </p>

        {plano.estudados > 0 && (
          <label class="opcao-check">
            <input type="checkbox" checked={trazer} onChange={(e) => setTrazer((e.target as HTMLInputElement).checked)} />
            <span class="textos">
              <strong>Trazer o progresso</strong>
              <small>
                Veio junto o progresso de {n(plano.estudados, 'cartão estudado', 'cartões estudados')}. {atual ? 'O que você já estudou aqui fica; o recebido entra onde for mais recente.' : 'Os cartões chegam já estudados.'}
              </small>
            </span>
          </label>
        )}

        {igual && atual ? (
          <>
            <p class="dica">Ele já está em Meus baralhos, pronto para estudar.</p>
            <button
              class="btn principal"
              disabled={ocupado}
              onClick={async () => {
                evento('recebido_baralho', { acao: 'ja_tinha', novos: 0, atualizados: 0, progresso: comProgresso })
                if (comProgresso) {
                  setOcupado(true)
                  await aplicarSoProgresso(plano)
                  nav.mudou()
                  nav.avisar({ texto: `Progresso de “${atual.titulo}” trazido.` })
                }
                fechar()
                nav.ir({ nome: 'baralho', id: atual.id })
              }}
            >
              {comProgresso ? 'Trazer o progresso' : 'Abrir baralho'}
            </button>
          </>
        ) : !atual ? (
          <>
            <p class="dica">Ele vai aparecer em Meus baralhos, pronto para estudar.</p>
            <button class="btn principal" disabled={ocupado} onClick={() => concluir(() => aplicar(plano, { comProgresso }), '“{t}” adicionado.')}>
              Adicionar baralho
            </button>
          </>
        ) : (
          <>
            <p class="dica">
              Você já tem este baralho (“{atual.titulo}”). Veja o que muda se atualizar:
            </p>
            <ul class="resumo-importacao">
              <li>Novos: {n(plano.novos.length, 'cartão novo', 'cartões novos')}</li>
              <li>Corrigidos: {n(plano.atualizados.length, 'cartão corrigido', 'cartões corrigidos')}</li>
              <li>Preservados: {n(plano.preservados.length, 'cartão que você editou: fica como está', 'cartões que você editou: ficam como estão')}</li>
              <li>Iguais: {n(plano.iguais, 'igual', 'iguais')}</li>
              {plano.soNoMeu > 0 && <li>Só no seu: {n(plano.soNoMeu, 'só seu: continua', 'só seus: continuam')} no baralho</li>}
              {plano.temasNovos.length > 0 && <li>Temas novos: {plano.temasNovos.map((t) => t.nome).join(', ')}</li>}
            </ul>
            <p class="dica">{comProgresso ? 'Nome e objetivo não mudam.' : 'Seu progresso, nome e objetivo não mudam.'}</p>
            <button class="btn principal" disabled={ocupado || (!mudancas && !comProgresso)} onClick={() => concluir(() => aplicar(plano, { comProgresso }), '“{t}” atualizado.')}>
              {mudancas ? `Atualizar (${n(mudancas, 'mudança', 'mudanças')})` : comProgresso ? 'Trazer só o progresso' : 'Nada para atualizar'}
            </button>
            <button class="btn secundario" disabled={ocupado} onClick={() => concluir(() => importarComoCopia(recebido, comProgresso ? plano.progresso : undefined), 'Importado como “{t}”.')}>
              Importar como baralho separado
            </button>
          </>
        )}
        <button class="btn secundario" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

/** Cartões soltos recebidos: escolher em qual baralho guardar. */
export function ImportarCartoes({ recebido, baralhos, nav, fechar }: { recebido: CartoesRecebidos; baralhos: Baralho[]; nav: Navegacao; fechar: () => void }) {
  const NOVO = '__novo__'
  const padrao = baralhos.find((b) => b.titulo.trim().toLowerCase() === recebido.origem.trim().toLowerCase())?.id ?? baralhos[0]?.id ?? NOVO
  const [destino, setDestino] = useState(padrao)
  const [ocupado, setOcupado] = useState(false)
  const n = recebido.cartoes.length
  const primeiro = recebido.cartoes[0]

  const guardar = async () => {
    setOcupado(true)
    evento('recebido_cartoes', { cartoes: recebido.cartoes.length })
    let alvo = baralhos.find((b) => b.id === destino)
    if (!alvo) alvo = { ...(await criar(recebido.origem)), temas: [] }
    const b = await adicionarCartoesRecebidos(alvo, recebido)
    nav.mudou()
    nav.avisar({ texto: `${n === 1 ? 'Cartão guardado' : `${n} cartões guardados`} em “${b.titulo}”.` })
    fechar()
    nav.ir({ nome: 'baralho', id: b.id })
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cartoes">
        <h2 id="titulo-cartoes">{n === 1 ? 'Cartão recebido' : `${n} cartões recebidos`}</h2>
        <p>{'frente' in primeiro ? primeiro.frente.replace(/[$*]/g, '') : primeiro.titulo}</p>
        <label class="campo">
          Guardar em
          <select value={destino} onChange={(e) => setDestino((e.target as HTMLSelectElement).value)}>
            {baralhos.map((b) => (
              <option value={b.id}>
                {b.titulo}
                {b.arquivadoEm ? ' (arquivado)' : ''}
              </option>
            ))}
            <option value={NOVO}>Novo baralho: {recebido.origem}</option>
          </select>
        </label>
        <button class="btn principal" disabled={ocupado} onClick={guardar}>
          Guardar
        </button>
        <button class="btn secundario" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
