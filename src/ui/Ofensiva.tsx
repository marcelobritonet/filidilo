// Ofensiva em Meus baralhos: selo (chama + folgas) no cabeçalho, fio do dia no topo e o cartão "Falta uma sessão hoje".
import { useEffect, useState } from 'preact/hooks'
import { db } from '../core/db'
import { MAX_FOLGAS, diaLocal, fracaoRestante, painelOfensiva, textoRestante, urgente, type Painel } from '../core/ofensiva'
import { evento } from '../core/telemetria'

/** Painel da ofensiva, refeito quando os dados mudam ou o dia vira; `agora` anda de minuto em minuto. */
export function usePainelOfensiva(versao: number) {
  const [agora, setAgora] = useState(Date.now())
  const [painel, setPainel] = useState<Painel | null>(null)
  const [ultimoBaralho, setUltimoBaralho] = useState<string | undefined>()
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])
  const dia = diaLocal(agora)
  useEffect(() => {
    painelOfensiva()
      .then((p) => {
        setPainel(p)
        if (p.usadas) evento('folga_usada', { n: p.usadas })
        if (p.perdida) evento('ofensiva_perdida', { sequencia: p.perdida })
      })
      .catch(() => undefined)
    db.revisoes
      .orderBy('data')
      .last()
      .then((r) => setUltimoBaralho(r?.cartao.split('/')[0]))
      .catch(() => undefined)
  }, [versao, dia])
  return { painel, agora, ultimoBaralho }
}

function Escudo({ cheio }: { cheio: boolean }) {
  return (
    <svg class={`escudo ${cheio ? 'cheio' : ''}`} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6z" fill={cheio ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
    </svg>
  )
}

/** Chama com o número e as folgas guardadas, ao lado da marca. */
export function SeloOfensiva({ painel, agora, abrir }: { painel: Painel; agora: number; abrir: () => void }) {
  const { sequencia, hojeFeito, folgas } = painel
  const pisca = !hojeFeito && sequencia > 0 && urgente(agora)
  const rotulo = `${sequencia} ${sequencia === 1 ? 'dia' : 'dias'} de ofensiva${hojeFeito ? ', hoje garantido' : ''}. ${folgas} de ${MAX_FOLGAS} folgas guardadas.`
  return (
    <button class={`selo-ofensiva ${hojeFeito ? 'feito' : ''} ${pisca ? 'pisca' : ''}`} aria-label={rotulo} onClick={abrir}>
      <span class="folgas" title={`${folgas} de ${MAX_FOLGAS} folgas`}>
        {Array.from({ length: MAX_FOLGAS }, (_, i) => (
          <Escudo cheio={i < folgas} />
        ))}
      </span>
      <span class="chama">
        🔥 {sequencia}
        {hojeFeito && <span class="garantido"> ✓</span>}
      </span>
    </button>
  )
}

/** Fio preso ao topo: encolhe até a meia-noite e só aparece enquanto falta a sessão de hoje. */
export function FioDoDia({ agora }: { agora: number }) {
  const resta = fracaoRestante(agora)
  return (
    <div class={`fio-dia ${urgente(agora) ? 'pisca' : ''}`} role="presentation">
      <div style={{ width: `${100 * resta}%` }} />
    </div>
  )
}

const ROTULO_ESTADO = { sessao: 'sessão concluída', folga: 'salvo por folga', falta: 'sem sessão', hoje: 'hoje, ainda falta' }

export function CartaoOfensiva({ painel, agora, estudar }: { painel: Painel; agora: number; estudar?: () => void }) {
  const { sequencia } = painel
  const pisca = sequencia > 0 && urgente(agora)
  return (
    <section class={`bloco ofensiva ${sequencia > 0 ? 'em-risco' : ''} ${pisca ? 'pisca' : ''}`}>
      <strong>{sequencia > 0 ? 'Falta uma sessão hoje' : 'Comece uma ofensiva hoje'}</strong>
      <p class="dica">
        {sequencia > 0
          ? `Termine uma sessão até meia-noite para manter ${sequencia === 1 ? 'o dia' : `os ${sequencia} dias`} de ofensiva.`
          : 'Termine uma sessão por dia e veja a chama crescer. Criar baralhos ou cartões com IA guarda folgas para os dias corridos.'}
      </p>
      <div class="ofensiva-linha">
        <div class="dias" aria-label="Últimos 7 dias">
          {painel.semana.map((d) => (
            <span class={d.estado} title={ROTULO_ESTADO[d.estado]}>
              <small>{d.rotulo}</small>
              <i aria-hidden="true" />
            </span>
          ))}
        </div>
        {estudar && (
          <button class="btn principal compacto" onClick={estudar}>
            Estudar
          </button>
        )}
      </div>
      {sequencia > 0 && <p class="dica restam">Restam {textoRestante(agora)}</p>}
    </section>
  )
}
