import { render } from 'preact'
import { App } from './ui/App'
import { aplicarPreferencia, lerPreferencia } from './ui/tema'
import './ui/estilo.css'

aplicarPreferencia(lerPreferencia())

render(<App />, document.getElementById('app')!)
