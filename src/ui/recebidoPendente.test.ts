import { describe, expect, it } from 'vitest'
import { esquecerPendente, guardarPendente, lerPendente } from './recebidoPendente'

function memoria(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}

const DIA = 24 * 60 * 60 * 1000

describe('baralho recebido deixado para depois', () => {
  it('guarda e lê de volta', () => {
    const ls = memoria()
    guardarPendente({ texto: '{}', titulo: 'Química', cartoes: 12 }, 1000, ls)
    expect(lerPendente(2000, ls)).toEqual({ texto: '{}', titulo: 'Química', cartoes: 12, em: 1000 })
  })

  it('some depois de 7 dias', () => {
    const ls = memoria()
    guardarPendente({ texto: '{}', titulo: 'Química', cartoes: 12 }, 0, ls)
    expect(lerPendente(7 * DIA, ls)).not.toBeNull()
    expect(lerPendente(7 * DIA + 1, ls)).toBeNull()
    expect(ls.length).toBe(0)
  })

  it('esquece ao adicionar ou descartar', () => {
    const ls = memoria()
    guardarPendente({ texto: '{}', titulo: 'Química', cartoes: 12 }, 0, ls)
    esquecerPendente(ls)
    expect(lerPendente(0, ls)).toBeNull()
  })

  it('ignora lixo', () => {
    const ls = memoria()
    ls.setItem('tatino-recebido-pendente', 'não é json')
    expect(lerPendente(0, ls)).toBeNull()
  })
})
