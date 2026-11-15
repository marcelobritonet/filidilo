/** Símbolo da ficha aberta (de src/assets/brand/simbolo.svg) e a marca "tatino." em serifada. */

export function Simbolo({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg class="simbolo" width={tamanho} height={tamanho} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="116" fill="#263F31" />
      <path d="M116 153q0-30 34-30h215v262H150q-34 0-34-34z" fill="#D7A453" />
      <path d="M365 153q0-30-34-30H150v262h181q34 0 34-34z" fill="#20262C" stroke="#E85A36" stroke-width="15" />
      <path d="M189 195h122M189 243h87M189 314q41-39 85 0" fill="none" stroke="#F2EEE5" stroke-width="18" stroke-linecap="round" />
    </svg>
  )
}

export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span class={`marca ${grande ? 'grande' : ''}`}>
      <Simbolo tamanho={grande ? 44 : 30} />
      <span class="marca-nome">tatino.</span>
    </span>
  )
}
