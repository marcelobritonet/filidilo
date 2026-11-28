import { describe, expect, it } from 'vitest'
import { acertouColunas, PARES_POR_VEZ, sortearPares } from './colunas'
import type { Baralho, CartaoColunas } from './types'
import { validar } from './validar'

const c: CartaoColunas = {
  id: 'k1', tipo: 'colunas', tema: 't', frente: 'Ligue cada país à sua capital',
  pares: [
    { esquerda: 'Brasil', direita: 'Brasília' },
    { esquerda: 'Argentina', direita: 'Buenos Aires' },
    { esquerda: 'Chile', direita: 'Santiago' },
    { esquerda: 'Peru', direita: 'Lima' },
    { esquerda: 'Uruguai', direita: 'Montevidéu' },
    { esquerda: 'Paraguai', direita: 'Assunção' },
  ],
}
const baralho = (cartoes: CartaoColunas[]): Baralho => ({ id: 'b', titulo: 'B', versao: 1, temas: [{ id: 't', nome: 'T' }], cartoes })

describe('ligar colunas', () => {
  it('sorteia 4 pares, com a direita embaralhada e o gabarito certo', () => {
    const vistos = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const s = sortearPares(c)
      expect(s.esquerda).toHaveLength(PARES_POR_VEZ)
      expect([...s.direita].sort()).toEqual(s.esquerda.map((e) => c.pares.find((p) => p.esquerda === e)!.direita).sort())
      s.esquerda.forEach((e, k) => expect(s.direita[s.certo[k]]).toBe(c.pares.find((p) => p.esquerda === e)!.direita))
      s.esquerda.forEach((e) => vistos.add(e))
    }
    expect(vistos.size).toBe(6)
  })
  it('acerto só com todos os pares certos', () => {
    expect(acertouColunas([2, 0, 3, 1], [2, 0, 3, 1])).toBe(true)
    expect(acertouColunas([2, 0, 1, 3], [2, 0, 3, 1])).toBe(false)
    expect(acertouColunas([2, 0, 3, null], [2, 0, 3, 1])).toBe(false)
  })
  it('validador: 4 a 10 pares, sem repetir esquerda nem direita', () => {
    expect(validar(baralho([c]))).toEqual([])
    expect(validar(baralho([{ ...c, pares: c.pares.slice(0, 3) }])).join()).toMatch(/4 a 10 pares/)
    expect(validar(baralho([{ ...c, pares: [...c.pares.slice(0, 5), { esquerda: 'Bolívia', direita: 'Lima' }] }])).join()).toMatch(/direita repetidos/)
    expect(validar(baralho([{ ...c, pares: [...c.pares.slice(0, 5), { esquerda: 'Bolívia', direita: '' }] }])).join()).toMatch(/"esquerda" e "direita"/)
  })
})
