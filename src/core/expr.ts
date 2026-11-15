// Avaliador de expressões matemáticas seguro (sem eval / Function).
// Suporta: números (1,5 não; use 1.5), 1e-5, variáveis, + - * / ^, parênteses,
// comparações (< > <= >= == !=, devolvem 1 ou 0), constantes pi, e
// e as funções listadas em FUNCOES.

export type Vars = Record<string, number>
type No = (v: Vars) => number

const FUNCOES: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sind: (x) => Math.sin((x * Math.PI) / 180),
  cosd: (x) => Math.cos((x * Math.PI) / 180),
  tand: (x) => Math.tan((x * Math.PI) / 180),
  asin: Math.asin,
  log10: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: (x, n = 0) => {
    const f = 10 ** n
    return Math.round(x * f) / f
  },
  se: (c, a, b) => (c ? a : b),
}

const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E }

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string }

function tokenizar(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i))
    if (num) {
      out.push({ t: 'num', v: Number(num[0]) })
      i += num[0].length
      continue
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))
    if (id) {
      out.push({ t: 'id', v: id[0] })
      i += id[0].length
      continue
    }
    const op = /^(<=|>=|==|!=|[-+*/^(),<>])/.exec(src.slice(i))
    if (op) {
      out.push({ t: 'op', v: op[0] })
      i += op[0].length
      continue
    }
    throw new Error(`Caractere inválido "${c}" em: ${src}`)
  }
  return out
}

function compilarTokens(tokens: Token[], src: string): No {
  let p = 0
  const ver = () => tokens[p]
  const ehOp = (v: string) => tokens[p]?.t === 'op' && tokens[p].v === v
  const esperar = (v: string) => {
    if (!ehOp(v)) throw new Error(`Esperado "${v}" em: ${src}`)
    p++
  }

  function comparacao(): No {
    const a = soma()
    const t = ver()
    if (t?.t === 'op' && ['<', '>', '<=', '>=', '==', '!='].includes(t.v)) {
      p++
      const b = soma()
      switch (t.v) {
        case '<': return (v) => +(a(v) < b(v))
        case '>': return (v) => +(a(v) > b(v))
        case '<=': return (v) => +(a(v) <= b(v))
        case '>=': return (v) => +(a(v) >= b(v))
        case '==': return (v) => +(a(v) === b(v))
        default: return (v) => +(a(v) !== b(v))
      }
    }
    return a
  }
  function soma(): No {
    let a = produto()
    while (ehOp('+') || ehOp('-')) {
      const op = tokens[p++].v
      const x = a
      const b = produto()
      a = op === '+' ? (v) => x(v) + b(v) : (v) => x(v) - b(v)
    }
    return a
  }
  function produto(): No {
    let a = unario()
    while (ehOp('*') || ehOp('/')) {
      const op = tokens[p++].v
      const x = a
      const b = unario()
      a = op === '*' ? (v) => x(v) * b(v) : (v) => x(v) / b(v)
    }
    return a
  }
  function unario(): No {
    if (ehOp('-')) {
      p++
      const a = unario()
      return (v) => -a(v)
    }
    if (ehOp('+')) {
      p++
      return unario()
    }
    return potencia()
  }
  function potencia(): No {
    const base = primario()
    if (ehOp('^')) {
      p++
      const exp = unario() // associativa à direita
      return (v) => base(v) ** exp(v)
    }
    return base
  }
  function primario(): No {
    const t = ver()
    if (!t) throw new Error(`Expressão incompleta: ${src}`)
    if (t.t === 'num') {
      p++
      const n = t.v
      return () => n
    }
    if (t.t === 'id') {
      p++
      if (ehOp('(')) {
        p++
        const f = Object.hasOwn(FUNCOES, t.v) ? FUNCOES[t.v] : undefined
        if (!f) throw new Error(`Função desconhecida "${t.v}" em: ${src}`)
        const args: No[] = []
        if (!ehOp(')')) {
          args.push(comparacao())
          while (ehOp(',')) {
            p++
            args.push(comparacao())
          }
        }
        esperar(')')
        return (v) => f(...args.map((a) => a(v)))
      }
      const nome = t.v
      if (Object.hasOwn(CONSTANTES, nome)) {
        const k = CONSTANTES[nome]
        return () => k
      }
      return (v) => {
        if (!Object.hasOwn(v, nome)) throw new Error(`Variável desconhecida "${nome}" em: ${src}`)
        return v[nome]
      }
    }
    if (ehOp('(')) {
      p++
      const a = comparacao()
      esperar(')')
      return a
    }
    throw new Error(`Símbolo inesperado "${t.v}" em: ${src}`)
  }

  const raiz = comparacao()
  if (p !== tokens.length) throw new Error(`Sobrou "${tokens[p].v}" em: ${src}`)
  return raiz
}

const cache = new Map<string, No>()

export function compilar(src: string): No {
  let f = cache.get(src)
  if (!f) {
    f = compilarTokens(tokenizar(src), src)
    cache.set(src, f)
  }
  return f
}

export function avaliar(src: string, vars: Vars): number {
  return compilar(src)(vars)
}
