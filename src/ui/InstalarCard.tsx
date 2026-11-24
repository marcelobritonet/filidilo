import { useState } from 'preact/hooks'
import { adiarInstalar, devePerguntar, estadoInstalar, pedirInstalar, type EstadoInstalar } from './instalar'

const PASSOS_IOS = ['Toque no botão Compartilhar do Safari (quadradinho com seta).', 'Escolha "Adicionar à Tela de Início".', 'Confirme em "Adicionar".']
const PASSOS_MANUAL = ['Abra o menu do navegador (⋮ ou ⋯).', 'Escolha "Instalar app" ou "Adicionar à tela inicial".']

/** Convite discreto na tela de baralhos: aparece só depois de algumas aberturas e pode ser adiado. */
export function InstalarCard() {
  const [visivel, setVisivel] = useState(devePerguntar)
  const [estado, setEstado] = useState<EstadoInstalar>(estadoInstalar)
  const [passos, setPassos] = useState(false)

  if (!visivel) return null

  const fechar = (definitivo = false) => {
    adiarInstalar(definitivo)
    setVisivel(false)
  }

  const instalar = async () => {
    if (await pedirInstalar()) return setVisivel(false)
    setEstado(estadoInstalar())
  }

  return (
    <section class="instalar-card" aria-labelledby="instalar-titulo">
      <h2 id="instalar-titulo">
        <svg class="brilho" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8z" />
          <path d="M18.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
        </svg>
        Quer o Filidilo na tela inicial?
      </h2>
      <p class="dica">Abre com um toque, em tela cheia, e continua funcionando sem internet.</p>
      {estado !== 'pronto' && passos && (
        <ol class="instalar-passos">
          {(estado === 'ios' ? PASSOS_IOS : PASSOS_MANUAL).map((p) => (
            <li>{p}</li>
          ))}
        </ol>
      )}
      <div class="instalar-pilulas">
        <button class="btn secundario" onClick={() => fechar(false)}>
          Agora não
        </button>
        {estado === 'pronto' && (
          <button class="btn principal" onClick={instalar}>
            Instalar
          </button>
        )}
        {estado !== 'pronto' && !passos && (
          <button class="btn principal" onClick={() => setPassos(true)}>
            Como instalar
          </button>
        )}
      </div>
      <button class="link instalar-nunca" onClick={() => fechar(true)}>
        Não perguntar mais
      </button>
    </section>
  )
}

/** Bloco fixo para a tela de Preferências: sempre disponível enquanto o app não estiver instalado. */
export function InstalarBloco() {
  const [estado, setEstado] = useState<EstadoInstalar>(estadoInstalar)
  if (estado === 'instalado') return <p class="dica">O Filidilo já está instalado neste aparelho.</p>
  const passos = estado === 'ios' ? PASSOS_IOS : PASSOS_MANUAL
  return (
    <section class="instalar-bloco">
      <h2>Instalar o app</h2>
      <p class="dica">Fica na tela inicial, abre em tela cheia e funciona sem internet.</p>
      {estado === 'pronto' ? (
        <button
          class="btn principal"
          onClick={async () => {
            if (!(await pedirInstalar())) setEstado(estadoInstalar())
            else setEstado('instalado')
          }}
        >
          Instalar agora
        </button>
      ) : (
        <ol class="instalar-passos">
          {passos.map((p) => (
            <li>{p}</li>
          ))}
        </ol>
      )}
    </section>
  )
}
