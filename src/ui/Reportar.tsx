import { useState } from 'preact/hooks'
import { db, uuid } from '../core/db'
import { chave } from '../core/srs'
import type { Baralho, Cartao } from '../core/types'

const MOTIVOS = ['Resposta errada', 'Pergunta confusa', 'Erro de digitação', 'Conta não bate', 'Outro']

export function Reportar({ baralho, cartao, fechar }: { baralho: Baralho; cartao: Cartao; fechar: () => void }) {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [texto, setTexto] = useState('')
  const [salvo, setSalvo] = useState(false)

  const salvar = async () => {
    await db.reportes.put({ id: uuid(), cartao: chave(baralho.id, cartao.id), motivo, texto: texto.trim(), data: Date.now(), enviado: false })
    setSalvo(true)
    setTimeout(fechar, 900)
  }

  return (
    <div class="modal-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-reporte">
        {salvo ? (
          <p class="resultado ok">✔ Obrigado! Reporte guardado.</p>
        ) : (
          <>
            <h2 id="titulo-reporte">Reportar erro neste cartão</h2>
            <div class="chips">
              {MOTIVOS.map((m) => (
                <button class={`chip ${m === motivo ? 'ativo' : ''}`} aria-pressed={m === motivo} onClick={() => setMotivo(m)}>
                  {m}
                </button>
              ))}
            </div>
            <textarea rows={3} placeholder="O que está errado? (opcional)" value={texto} onInput={(e) => setTexto((e.target as HTMLTextAreaElement).value)} />
            <p class="dica">Depois, em “Backup e reportes”, toque em “Enviar reportes” para mandar pelo WhatsApp.</p>
            <div class="linha">
              <button class="btn secundario" onClick={fechar}>
                Cancelar
              </button>
              <button class="btn principal" onClick={salvar}>
                Guardar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
