import { render } from 'preact'
import { plataforma, tamanhoTela } from './core/metricas'
import { iniciarTelemetria, lerOrigemDaUrl, marcarTesteDaUrl } from './core/telemetria'
import { App } from './ui/App'
import { aplicarPreferencia, lerPreferencia } from './ui/tema'
import './ui/estilo.css'

aplicarPreferencia(lerPreferencia())

marcarTesteDaUrl()
// Sempre lida (a marca ?de= sai do endereço mesmo com as estatísticas desligadas).
const origem = lerOrigemDaUrl()
iniciarTelemetria({ plataforma: plataforma(navigator.userAgent, navigator.maxTouchPoints), tela: tamanhoTela(window.innerWidth) }, origem)

render(<App />, document.getElementById('app')!)
