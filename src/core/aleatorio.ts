/**
 * Sorteios do app. Usa o gerador criptográfico do navegador (mais uniforme que Math.random)
 * e cai no Math.random só onde ele não existir.
 */
const temCrypto = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
const buffer = new Uint32Array(1)

/** Número em [0, 1), como Math.random. */
export function aleatorio(): number {
  if (!temCrypto) return Math.random()
  crypto.getRandomValues(buffer)
  return buffer[0] / 2 ** 32
}

/** Inteiro em [0, n). */
export const inteiro = (n: number, rng: () => number = aleatorio) => Math.floor(rng() * n)

/** Cópia embaralhada (Fisher–Yates: todas as ordens com a mesma chance). */
export function embaralhar<T>(lista: readonly T[], rng: () => number = aleatorio): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = inteiro(i + 1, rng)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
