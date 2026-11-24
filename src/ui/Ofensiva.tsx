// Ofensiva em Meus baralhos: selo (fechado no ocelo; abre com folgas, número e leque) no cabeçalho, fio do dia no topo e o cartão "Falta uma sessão hoje".
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { db } from '../core/db'
import { MAX_FOLGAS, deveAbrirSelo, diaLocal, lerVistoSelo, vistoDoPainel, fracaoRestante, painelOfensiva, textoRestante, urgente, type Painel } from '../core/ofensiva'
import { evento } from '../core/telemetria'
import { DesenhoOfensiva, Ocelo, PenaFolga } from './Marca'

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

const CHAVE_SELO = 'tatino-ofensiva-selo'
/** Largura do selo fechado (a pílula redonda), em px; igual ao CSS. */
const TAMANHO_SELO = 40
/** Espera a tela assentar (e a abertura do app esmaecer) antes de abrir, e quanto tempo fica aberto. */
const ESPERA_ABRIR = 450
const TEMPO_ABERTO = 2800

function lerVisto() {
  try {
    return lerVistoSelo(localStorage.getItem(CHAVE_SELO))
  } catch {
    return null
  }
}

/**
 * Selo fechado: só o ocelo, numa pílula redonda. Na primeira vez do dia ou quando a ofensiva muda,
 * abre para a esquerda (com quique) mostrando as folgas, o número e o ✓; o ocelo vira leque com 7 dias
 * ou mais; uma luz dá a volta no contorno e ele fecha sozinho.
 */
export function SeloOfensiva({ painel, agora, abrir }: { painel: Painel; agora: number; abrir: () => void }) {
  const { sequencia, hojeFeito, folgas } = painel
  const hoje = diaLocal(agora)
  const pisca = !hojeFeito && sequencia > 0 && urgente(agora)
  const rotulo = `${sequencia} ${sequencia === 1 ? 'dia' : 'dias'} de ofensiva${hojeFeito ? ', hoje garantido' : ''}. ${folgas} de ${MAX_FOLGAS} folgas guardadas.`
  const [aberto, setAberto] = useState(false)
  const [volta, setVolta] = useState(0)
  const [largura, setLargura] = useState(0)
  const extra = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => setLargura(extra.current?.scrollWidth ?? 0), [sequencia, hojeFeito, folgas])

  useEffect(() => {
    const p = { sequencia, hojeFeito, folgas }
    if (!deveAbrirSelo(lerVisto(), p, hoje)) return
    let abre = 0
    let fecha = 0
    const comecar = () => {
      abre = window.setTimeout(() => {
        try {
          localStorage.setItem(CHAVE_SELO, JSON.stringify(vistoDoPainel(p, hoje)))
        } catch {
          /* sem localStorage: abre toda vez */
        }
        setAberto(true)
        setVolta((v) => v + 1)
        fecha = window.setTimeout(() => setAberto(false), TEMPO_ABERTO)
      }, ESPERA_ABRIR)
    }
    // Com a abertura do app na tela, espera ela sair para o selo abrir à vista.
    const raiz = document.documentElement
    const obs = new MutationObserver(() => {
      if (raiz.classList.contains('abrindo')) return
      obs.disconnect()
      comecar()
    })
    if (raiz.classList.contains('abrindo')) obs.observe(raiz, { attributes: true, attributeFilter: ['class'] })
    else comecar()
    return () => {
      obs.disconnect()
      clearTimeout(abre)
      clearTimeout(fecha)
    }
  }, [sequencia, hojeFeito, folgas, hoje])

  return (
    <button
      class={`selo-ofensiva ${hojeFeito ? 'feito' : ''} ${pisca ? 'pisca' : ''} ${aberto ? 'aberto' : ''}`}
      style={{ width: aberto ? `${TAMANHO_SELO + largura}px` : undefined }}
      aria-label={rotulo}
      onClick={abrir}
    >
      <span class="selo-corpo">
      <span class="selo-extra" ref={extra} aria-hidden="true">
        <span class="folgas" title={`${folgas} de ${MAX_FOLGAS} folgas`}>
          {Array.from({ length: MAX_FOLGAS }, (_, i) => (
            <PenaFolga cheia={i < folgas} />
          ))}
        </span>
        <span class="numero">{sequencia}</span>
        {hojeFeito && <span class="garantido">✓</span>}
      </span>
      <span class="selo-icone" aria-hidden="true">
        <span class="fechado">
          <Ocelo tamanho={24} apagado={!hojeFeito || sequencia === 0} />
        </span>
        <span class="aberto">
          <DesenhoOfensiva dias={sequencia} aceso={hojeFeito} tamanho={sequencia >= 30 ? 20 : sequencia >= 7 ? 22 : 24} />
        </span>
      </span>
      </span>
      {aberto && (
        <svg class="selo-brilho" key={volta} aria-hidden="true" focusable="false">
          {/* Em cima da borda: o svg cobre a caixa inteira do botão (borda de 1px) e o traço de 2px passa sobre ela. */}
          <rect x="1" y="1" width={TAMANHO_SELO + largura - 2} height={TAMANHO_SELO - 2} rx={(TAMANHO_SELO - 2) / 2} pathLength={100} />
        </svg>
      )}
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
          : 'Termine uma sessão por dia e veja o leque abrir. Criar baralhos ou cartões com IA guarda folgas para os dias corridos.'}
      </p>
      <div class="ofensiva-linha">
        <div class="dias" aria-label="Últimos 7 dias">
          {painel.semana.map((d) => (
            <span class={d.estado} title={ROTULO_ESTADO[d.estado]}>
              <small>{d.rotulo}</small>
              {d.estado === 'sessao' ? <Ocelo tamanho={20} /> : <i aria-hidden="true" />}
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
