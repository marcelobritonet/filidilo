import { render } from 'preact'
import { iniciarTelemetria } from './core/telemetria'
import { App } from './ui/App'
import { aplicarPreferencia, lerPreferencia } from './ui/tema'
import './ui/estilo.css'

aplicarPreferencia(lerPreferencia())

iniciarTelemetria()

render(<App />, document.getElementById('app')!)
