// Ícones de linha da marca (referência: icones-conceituais.svg), em currentColor.
// Sempre acompanham um rótulo de texto; por isso ficam ocultos para leitores de tela.

export type NomeIcone = 'revisar' | 'entender' | 'praticar' | 'avancar' | 'enviar' | 'sync'

const TRACOS: Record<NomeIcone, string> = {
  revisar: 'M6 7.3h11.9v10.3H6zM8.5 10.6h7.2M8.5 14h5M14.1 18.4l2.3 2.3 4.4-5.3',
  entender: 'M5.6 15.8c1-6.8 11.2-6.8 12.9-.9M7.3 17.8c3.8 2.7 9.1 2.3 12.6-1M11.9 6.4v3M8.2 8.2l2 2.3M15.5 8.2l-2 2.3',
  praticar: 'M6.3 7.7h11.4v9.9H6.3zM8.5 10.9h7M8.5 14.1h4.6M6.4 18.8l-2.3 2.3M17.7 18.8l2.3 2.3',
  // Compartilhar do Android: três pontos ligados.
  enviar: 'M19.2 7.5a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0zM9.2 13a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0zM19.2 18.5a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0zM15.1 8.6l-6.2 3.3M8.9 14.1l6.2 3.3',
  // Sincronizar: duas setas girando.
  sync: 'M17.6 10.6a6 6 0 0 0-11 .9M6.4 15.4a6 6 0 0 0 11-.9M17.9 7.2v3.6h-3.6M6.1 18.8v-3.6h3.6',
  avancar: 'M8.8 12.1l2.3 2.4 4.7-5.4M18.3 12a6.3 6.3 0 1 1-12.6 0 6.3 6.3 0 0 1 12.6 0z',
}

export function Icone({ nome, tamanho = 24 }: { nome: NomeIcone; tamanho?: number }) {
  return (
    <svg
      class={`icone-linha icone-${nome}`}
      width={tamanho}
      height={tamanho}
      viewBox="3 4 18 18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRACOS[nome]} />
    </svg>
  )
}
