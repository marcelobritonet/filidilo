import { useMemo } from 'preact/hooks'

/** Confete em CSS: some sozinho e não aparece com "reduzir movimento". */
export function Confete() {
  const pedacos = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ x: (i * 37) % 100, atraso: (i % 9) * 0.12, cor: i % 4, giro: (i * 47) % 360 })), [])
  return (
    <div class="confete" aria-hidden="true">
      {pedacos.map((p) => (
        <span class={`c${p.cor}`} style={{ left: `${p.x}%`, animationDelay: `${p.atraso}s`, transform: `rotate(${p.giro}deg)` }} />
      ))}
    </div>
  )
}
