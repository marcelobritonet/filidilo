import { describe, expect, it } from 'vitest'
import { validar } from '../validar'
import { EXEMPLOS, montarCorrecao, montarInstrucao, montarInstrucaoFormatacao, VERSAO_INSTRUCAO } from './instrucao'
import { extrairJson, lerPlano, lerResposta, parecePerguntas } from './resposta'

const destino = { id: 'fis', titulo: 'Física', versao: 1, temas: [{ id: 'dinamica', nome: 'Dinâmica' }] }

describe('instrução para o Gemini', () => {
  it('modo formatar: inclui as perguntas coladas, proíbe invenção e pede naoConvertidos', () => {
    const t = montarInstrucaoFormatacao({ texto: 'P: O que é inércia? R: resistência à mudança' })
    expect(t).toContain('O que é inércia?')
    expect(t).toContain('Não invente')
    expect(t).toContain('naoConvertidos')
    expect(t).toContain('SOMENTE')
    expect(t).not.toContain('"baralho"')
    // A lista de tipos a escolher cita as lacunas (P70).
    expect(t).toMatch(/Escolha o tipo[^\n]*"lacunas"/)
  })

  it('modo formatar para baralho novo: pede o bloco baralho e usa o nome dado', () => {
    const sem = montarInstrucaoFormatacao({ texto: 'P: O que é inércia? R: resistência', novo: {} })
    expect(sem).toContain('"baralho": { "titulo"')
    expect(sem).toContain('baralho novo')
    const com = montarInstrucaoFormatacao({ texto: 'P: O que é inércia? R: resistência', novo: { titulo: 'Física 1' } })
    expect(com).toContain('use o título "Física 1"')
    // Baralho novo não tem o que já está coberto.
    expect(montarInstrucaoFormatacao({ texto: 'x', novo: {}, baralho: { titulo: 'F', temas: [], cartoes: [{ id: 'a', tipo: 'conceito', tema: 'g', frente: 'Pergunta antiga', verso: 'v' }] } })).not.toContain('Já cobertos')
  })

  it('os exemplos da instrução passam no validador do app', () => {
    expect(validar({ id: 'x', titulo: 'x', versao: 1, temas: EXEMPLOS.temas, cartoes: EXEMPLOS.cartoes }, 200)).toEqual([])
  })
  it('inclui quantidade, mistura, origem e os temas do baralho', () => {
    const t = montarInstrucao({ origem: 'pdf', nomePdf: 'Aula 4.pdf', paginas: '3-9', quantidade: 20, mistura: 'teoria', baralho: { titulo: 'Física', temas: destino.temas } })
    expect(t).toContain('Crie 20 cartões')
    expect(t).toContain('Não crie "calculo"')
    expect(t).toContain('"Aula 4.pdf"')
    expect(t).toContain('somente as páginas 3-9')
    expect(t).toContain('"dinamica": Dinâmica')
    expect(t).toContain('"pagina": número da página')
    // O exemplo dentro da instrução é JSON válido.
    expect(extrairJson(t)).toEqual(JSON.parse(JSON.stringify(EXEMPLOS)))
  })
  it('texto colado e tema descrito', () => {
    expect(montarInstrucao({ origem: 'texto', texto: 'A água ferve a 100 °C.', quantidade: 10, mistura: 'misto' })).toContain('===\nA água ferve a 100 °C.\n===')
    expect(montarInstrucao({ origem: 'tema', assunto: 'Leis de Newton', quantidade: 10, mistura: 'misto' })).toContain('"Leis de Newton"')
  })
  it('pedido de correção lista os cartões', () => {
    expect(montarCorrecao([{ id: 'c3', erros: ['índice "correta" fora das opções'] }])).toContain('- Cartão "c3": índice "correta" fora das opções')
  })
})

describe('lendo a resposta', () => {
  it('acha o JSON com texto em volta, cercas ```json, vírgula sobrando e aspas tipográficas', () => {
    expect(extrairJson('Claro! Aqui está:\n```json\n{"cartoes": [{"a": 1},]}\n```\nBons estudos!')).toEqual({ cartoes: [{ a: 1 }] })
    expect(extrairJson('{“cartoes”: []}')).toEqual({ cartoes: [] })
    expect(() => extrairJson('')).toThrow(/vazia/)
    expect(() => extrairJson('só texto')).toThrow(/JSON válido/)
  })

  it('conserta a cópia do ChatGPT fora do bloco: &#x20;, \\_, \\* e \\[', () => {
    const t = '\\{"cartoes":&#x20;\\[{"frente":&#x20;"A lei de\\_Newton","verso":"\\*\\*F = m·a\\*\\*"}\\]\\}'
    expect(extrairJson(t)).toEqual({ cartoes: [{ frente: 'A lei de_Newton', verso: '**F = m·a**' }] })
  })

  it('conserta NBSP, caracteres invisíveis e entidades', () => {
    expect(extrairJson('{ "cartoes":​ [{"frente": "água &amp; sal"}]}')).toEqual({ cartoes: [{ frente: 'água & sal' }] })
  })

  it('dobra a barra simples de LaTeX e escapa a quebra de linha crua', () => {
    expect(extrairJson('{"verso": "$\\Delta s$ e $\\sigma$"}')).toEqual({ verso: '$\\Delta s$ e $\\sigma$' })
    expect(extrairJson('{"verso": "linha 1\nlinha 2"}')).toEqual({ verso: 'linha 1\nlinha 2' })
  })

  it('não estraga JSON que já é válido', () => {
    const t = '{"verso": "$\\\\frac{a}{b}$\\nfim", "x": "aspas \\"internas\\""}'
    expect(extrairJson(t)).toEqual(JSON.parse(t))
  })

  it('avisa quando a resposta veio cortada', () => {
    expect(() => extrairJson('```json\n{"cartoes": [{"frente": "a"}, {"frente": "b"}, {"fre\n```')).toThrow(/cortada/)
    expect(() => extrairJson('{"cartoes": [{"frente": "a"}, {"frente": "b"')).toThrow(/cortada/)
  })

  it('reaproveita temas, cria os novos, dá ids novos e valida cartão a cartão', () => {
    const resposta = {
      temas: [{ id: 'Dinâmica', nome: 'Dinâmica' }, { id: 'energia', nome: 'Energia' }],
      cartoes: [
        { id: 'c1', tipo: 'conceito', tema: 'Dinâmica', frente: 'O que é força?', verso: 'Interação que muda o movimento.' },
        { id: 'c2', tipo: 'vf', tema: 'energia', frente: 'Energia se cria do nada.', resposta: 'false', explicacao: 'Conservação da energia.' },
        { id: 'c3', tipo: 'associacao', tema: 'energia', frente: 'Unidade de energia?', opcoes: ['J', 'N'], correta: 5 },
        { id: 'c4', tipo: 'conceito', tema: 'ondas', frente: 'O que é frequência?', verso: 'Oscilações por segundo.' },
      ],
    }
    const r = lerResposta(resposta, destino, 'Aula 4.pdf')
    expect(r.temasNovos).toEqual([{ id: 'energia', nome: 'Energia' }, { id: 'ondas', nome: 'ondas' }])
    expect(r.cartoes.map((c) => c.cartao.tema)).toEqual(['dinamica', 'energia', 'energia', 'ondas'])
    expect(r.cartoes.map((c) => c.erros.length)).toEqual([0, 0, 1, 0])
    expect(r.cartoes[2]).toMatchObject({ idIA: 'c3', erros: ['índice "correta" fora das opções'] })
    expect(r.cartoes[1].cartao).toMatchObject({ resposta: false, origem: 'ia', fonte: { apostila: 'Aula 4.pdf' } })
    expect(new Set(r.cartoes.map((c) => c.cartao.id)).size).toBe(4)
    expect(r.cartoes.every((c) => c.cartao.id.startsWith('ia-'))).toBe(true)
  })

  it('um cálculo com fórmula quebrada é recusado com o motivo', () => {
    const r = lerResposta(
      { cartoes: [{ id: 'k', tipo: 'calculo', tema: 'dinamica', titulo: 't', enunciado: 'm={m}', parametros: { m: { min: 1, max: 2, passo: 1 } }, etapas: [{ pergunta: 'p', expr: 'm*g', resolucao: ['{m}'] }] }] },
      destino,
    )
    expect(r.cartoes[0].erros[0]).toMatch(/Variável desconhecida "g"/)
  })

  it('aceita lista crua de cartões ou "cards"', () => {
    expect(lerResposta([{ tipo: 'conceito', tema: 'x', frente: 'a', verso: 'b' }], destino).cartoes).toHaveLength(1)
    expect(lerResposta({ cards: [{ tipo: 'conceito', tema: 'x', frente: 'a', verso: 'b' }] }, destino).cartoes).toHaveLength(1)
    expect(() => lerResposta({ temas: [] }, destino)).toThrow(/cartoes/)
  })

  it('guarda a descrição dos temas novos', () => {
    const r = lerResposta({ temas: [{ id: 'ondas', nome: 'Ondas', descricao: 'Frequência e comprimento' }], cartoes: [{ tipo: 'conceito', tema: 'ondas', frente: 'a', verso: 'b' }] }, destino)
    expect(r.temasNovos).toEqual([{ id: 'ondas', nome: 'Ondas', descricao: 'Frequência e comprimento' }])
  })
})

describe('instrução v3 (objetivo e cobertos)', () => {
  it('versão 3', () => {
    expect(VERSAO_INSTRUCAO).toBe(8)
  })

  it('com objetivo: seção, nível, foco, evitar (spoilers), descrição do tema e prioridade', () => {
    const t = montarInstrucao({
      origem: 'tema',
      assunto: 'Espanhol',
      quantidade: 15,
      mistura: 'misto',
      temaPrioritario: 'verbos',
      baralho: {
        titulo: 'Espanhol',
        temas: [{ id: 'verbos', nome: 'Verbos', descricao: 'Presente do indicativo' }],
        objetivo: { resumo: 'Conversar no México', nivel: 'nocoes', foco: ['pedir comida'], evitar: ['gramática formal'] },
      },
    })
    expect(t).toContain('## Objetivo do baralho\nObjetivo: Conversar no México\nNível de conhecimento: boas noções. Pessoa com boas noções: pergunte o porquê e o como, e as distinções que confundem quem está começando. Pode supor os termos básicos e não repita o óbvio.\nFoque em: pedir comida.\nNão crie nada sobre: gramática formal. Isso vale também para spoilers.')
    expect(t).toContain('"verbos": Verbos — Presente do indicativo (prioridade: crie mais cartões deste tema)')
    expect(t).toContain('Priorize o que mais serve ao objetivo.')
    expect(t).toContain('"Gerado por IA"')
    expect(t).not.toContain('Gemini')
  })

  it('sem objetivo: sem seção, prioridade do assunto e sem seção de cobertos sem cartões', () => {
    const t = montarInstrucao({ origem: 'tema', assunto: 'Leis de Newton', quantidade: 10, mistura: 'teoria', baralho: { titulo: 'Física', temas: destino.temas } })
    expect(t).not.toContain('## Objetivo do baralho')
    expect(t).not.toContain('## Já cobertos')
    expect(t).toContain('Priorize o que é mais importante do assunto.')
  })

  it('inclui os cartões já feitos em "Já cobertos"', () => {
    const t = montarInstrucao({
      origem: 'tema',
      assunto: 'Física',
      quantidade: 10,
      mistura: 'misto',
      baralho: {
        titulo: 'Física',
        temas: destino.temas,
        cartoes: [{ id: 'c1', tipo: 'conceito', tema: 'dinamica', frente: 'Qual a unidade de força no **SI**?', verso: 'N' }],
      },
    })
    expect(t).toContain('Já cobertos (não repita o mesmo assunto com a mesma pergunta; pode aprofundar):\nDinâmica: unidade força SI')
  })
})

describe('plano: leitura da resposta (Aprender)', () => {
  const plano = {
    baralho: { titulo: 'Espanhol para viagem', objetivo: 'Conversar o básico no México', nivel: 'iniciante', foco: ['números', 'pedir comida'], evitar: ['gramática formal'] },
    temas: [{ id: 'saudacoes', nome: 'Saudações', descricao: 'Cumprimentar e agradecer' }],
    cartoes: [{ id: 'c1', tipo: 'conceito', tema: 'saudacoes', frente: 'Como se diz olá?', verso: 'Hola' }],
  }

  it('resposta completa: título, objetivo, tema com descrição e cartões', () => {
    const r = lerPlano(plano, 'espanhol para viajar')
    expect(r.baralho).toEqual({
      titulo: 'Espanhol para viagem',
      objetivo: { pedido: 'espanhol para viajar', resumo: 'Conversar o básico no México', nivel: 'iniciante', foco: ['números', 'pedir comida'], evitar: ['gramática formal'] },
    })
    expect(r.temasNovos).toEqual([{ id: 'saudacoes', nome: 'Saudações', descricao: 'Cumprimentar e agradecer' }])
    expect(r.cartoes).toHaveLength(1)
    expect(r.cartoes[0].erros).toEqual([])
    expect(r.cartoes[0].cartao).toMatchObject({ origem: 'ia', fonte: { apostila: 'Gerado por IA' } })
  })

  it('perguntas próprias: fonte padrão trocada', () => {
    const r = lerPlano({ temas: plano.temas, cartoes: plano.cartoes }, 'Minhas perguntas', 'Perguntas próprias')
    expect(r.cartoes[0].cartao).toMatchObject({ fonte: { apostila: 'Perguntas próprias' } })
  })

  it('sem bloco baralho: título é o pedido cortado em 40, sem objetivo', () => {
    const r = lerPlano({ temas: plano.temas, cartoes: plano.cartoes }, 'a'.repeat(60))
    expect(r.baralho).toEqual({ titulo: 'a'.repeat(40) })
  })

  it('nível inválido é ignorado', () => {
    const r = lerPlano({ ...plano, baralho: { ...plano.baralho, nivel: 'mestre' } }, 'x')
    expect(r.baralho.objetivo?.nivel).toBeUndefined()
    expect(r.baralho.objetivo?.resumo).toBe('Conversar o básico no México')
  })

  it('estoura os limites: título 40, resumo 160, 5 itens de 60, descrição 120', () => {
    const r = lerPlano(
      {
        baralho: { titulo: 'T'.repeat(60), objetivo: 'o'.repeat(200), foco: Array.from({ length: 7 }, () => 'f'.repeat(80)), evitar: [] },
        temas: [{ id: 'x', nome: 'X', descricao: 'd'.repeat(200) }],
        cartoes: [{ id: 'c1', tipo: 'conceito', tema: 'x', frente: 'a', verso: 'b' }],
      },
      'pedido',
    )
    expect(r.baralho.titulo).toHaveLength(40)
    expect(r.baralho.objetivo?.resumo).toHaveLength(160)
    expect(r.baralho.objetivo?.foco).toHaveLength(5)
    expect(r.baralho.objetivo?.foco?.[0]).toHaveLength(60)
    expect(r.baralho.objetivo?.evitar).toBeUndefined()
    expect(r.temasNovos[0].descricao).toHaveLength(120)
  })

  it('só perguntas: detectadas, sem JSON', () => {
    const texto = 'Antes de montar:\nQual é o seu nível?\nPara quando você quer aprender?\nObrigado!'
    expect(parecePerguntas(texto)).toBe(true)
    expect(() => extrairJson(texto)).toThrow(/JSON válido/)
  })

  it('perguntas com JSON: não são perguntas, e o JSON é lido', () => {
    const texto = 'Pode ser assim?\n```json\n' + JSON.stringify(plano) + '\n```'
    expect(parecePerguntas(texto)).toBe(false)
    expect(lerPlano(extrairJson(texto), 'pedido').cartoes).toHaveLength(1)
  })

  it('perguntas com exemplo entre parênteses no fim (como o Gemini fez no teste T3)', () => {
    const texto = 'Para montar o plano ideal do zero para você, me diga rapidinho:\n\nQual é o seu objetivo principal? (ex.: viajar, trabalho, dia a dia ou começar do começo sem pressa)\n\nQuanto tempo por dia você pretende estudar? (ex.: 5 a 10 minutos ou 20+ minutos)'
    expect(parecePerguntas(texto)).toBe(true)
  })

  it('texto sem JSON e sem pergunta não é pergunta', () => {
    expect(parecePerguntas('Não entendi o pedido.')).toBe(false)
  })
})
