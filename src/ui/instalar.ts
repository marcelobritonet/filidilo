// Instalação do tatino como app (PWA). Captura o convite do navegador logo no início,
// para não perdê-lo caso ele chegue antes de a tela montar, e decide quando perguntar.
import { evento } from '../core/telemetria'

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** 'instalado': já roda como app. 'pronto': dá para instalar com um toque.
 *  'ios': Safari do iPhone/iPad, instalar pelo menu Compartilhar. 'manual': outro navegador, sem convite. */
export type EstadoInstalar = 'instalado' | 'pronto' | 'ios' | 'manual'

let convite: EventoInstalar | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    convite = e as EventoInstalar
  })
  window.addEventListener('appinstalled', () => {
    convite = null
    evento('instalar_concluido')
  })
}

const CHAVE = 'tatino-instalar'
const DIAS_ADIAR = 7
const MAX_ADIAMENTOS = 3

interface Registro {
  aberturas: number
  adiamentos: number
  ultimaVez?: number
  nunca?: boolean
}

function lerRegistro(): Registro {
  try {
    return { aberturas: 0, adiamentos: 0, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') }
  } catch {
    return { aberturas: 0, adiamentos: 0 }
  }
}

function salvarRegistro(r: Registro) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(r))
  } catch {
    /* modo privado ou armazenamento bloqueado: segue sem lembrar */
  }
}

export function estadoInstalar(): EstadoInstalar {
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return 'instalado'
  if (convite) return 'pronto'
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'ios'
  return 'manual'
}

/** Conta uma abertura por sessão do navegador (não a cada volta de tela). */
export function registrarAbertura() {
  if (sessionStorage.getItem('tatino-aberto-nesta-sessao')) return
  sessionStorage.setItem('tatino-aberto-nesta-sessao', '1')
  const r = lerRegistro()
  salvarRegistro({ ...r, aberturas: r.aberturas + 1 })
}

/** Pergunta só quando faz sentido: a partir da 2ª abertura, no máximo uma vez por semana,
 *  e para de perguntar depois de adiado 3 vezes ou se a pessoa pedir "não perguntar mais". */
export function devePerguntar(): boolean {
  if (estadoInstalar() === 'instalado') return false
  const r = lerRegistro()
  if (r.nunca || r.adiamentos >= MAX_ADIAMENTOS) return false
  if (r.aberturas < 2) return false
  if (r.ultimaVez && Date.now() - r.ultimaVez < DIAS_ADIAR * 864e5) return false
  return true
}

export function adiarInstalar(definitivo = false) {
  const r = lerRegistro()
  salvarRegistro({ ...r, adiamentos: r.adiamentos + 1, ultimaVez: Date.now(), nunca: definitivo || r.nunca })
  evento('instalar_adiado', { definitivo })
}

/** Dispara o convite nativo (Chrome/Edge/Android). Devolve true se foi instalado. */
export async function pedirInstalar(): Promise<boolean> {
  if (!convite) return false
  evento('instalar_pedido')
  await convite.prompt()
  const { outcome } = await convite.userChoice
  convite = null
  if (outcome === 'accepted') evento('instalar_aceito')
  return outcome === 'accepted'
}
