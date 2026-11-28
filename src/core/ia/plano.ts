// Harness "Aprender uma coisa nova hoje": monta a instrução que a pessoa cola na IA para planejar um baralho.
// Versão da instrução: mude ao alterar regras (como em VERSAO_INSTRUCAO).
import { infoNivel, type Cartao, type Nivel, type Tema } from '../types'
import { fonteDe, origemTexto, quantidadeArquivo, regraNaoEntregar, regraPagina, regrasTextoJson, regrasTipos } from './instrucao'

export const VERSAO_PLANO = 9

export interface PedidoPlano {
  /** O que a pessoa digitou em "Aprender uma coisa nova hoje". Com arquivo, pode ficar vazio. */
  pedido: string
  /** Quanto a pessoa já sabe (escolhido ao lado do pedido). */
  nivel?: Nivel
  /** Material opcional: arquivo anexado na IA (PDF ou imagens) ou texto colado. */
  origem?: 'arquivo' | 'texto'
  texto?: string
}

/** Exemplo curto de outro assunto. Testado pelo validador (plano.test.ts). */
export const EXEMPLO_PLANO: {
  baralho: { titulo: string; objetivo: string; nivel: Nivel; foco: string[]; evitar: string[] }
  temas: Tema[]
  cartoes: Cartao[]
} = {
  baralho: {
    titulo: 'Xadrez básico',
    objetivo: 'Jogar partidas curtas sabendo o movimento das peças',
    nivel: 'iniciante',
    foco: ['movimento das peças', 'xeque e xeque-mate'],
    evitar: ['aberturas profundas'],
  },
  temas: [
    { id: 'pecas', nome: 'Peças', descricao: 'Como cada peça se move' },
    { id: 'regras', nome: 'Regras', descricao: 'Xeque, xeque-mate e empate' },
  ],
  cartoes: [
    {
      id: 'c1', tipo: 'conceito', tema: 'regras',
      frente: 'Qual a diferença entre xeque e xeque-mate?',
      verso: 'No xeque, o rei está atacado e precisa sair da ameaça. No xeque-mate, não existe lance que salve o rei.',
      outrasFrentes: [
        'O que separa um xeque de um xeque-mate?',
        'Quando um xeque passa a ser xeque-mate?',
        'Para o rei, qual a diferença entre levar xeque e levar xeque-mate?',
      ],
      fonte: { apostila: 'Gerado por IA' },
    },
    {
      id: 'c2', tipo: 'vf', tema: 'regras',
      frente: 'Empate por afogamento acontece quando o rei está em xeque.',
      resposta: false,
      explicacao: 'No afogamento, o rei não está em xeque e o jogador da vez não tem nenhum lance legal.',
      variantes: [
        { frente: 'No afogamento, o rei do jogador da vez não está em xeque.', resposta: true },
        { frente: 'Quem afoga o rei adversário vence a partida.', resposta: false, explicacao: 'O afogamento termina a partida empatada.' },
        { frente: 'Sem nenhum lance legal e sem estar em xeque, o jogador da vez empata a partida.', resposta: true },
      ],
      fonte: { apostila: 'Gerado por IA' },
    },
    {
      id: 'c3', tipo: 'associacao', tema: 'pecas',
      frente: 'Qual peça se move em forma de L?',
      outrasFrentes: [
        'Qual peça pode pular por cima das outras?',
        'Qual peça anda duas casas numa direção e uma para o lado?',
        'Que peça começa o jogo entre a torre e o bispo?',
      ],
      opcoes: ['Bispo', 'Cavalo', 'Torre', 'Dama', 'Rei', 'Peão'],
      correta: 1,
      outrasFormas: ['O cavalo', 'Cavalo (C)'],
      explicacao: 'O cavalo salta duas casas numa direção e uma na perpendicular.',
      fonte: { apostila: 'Gerado por IA' },
    },
  ],
}

/** Instrução de planejamento completa para colar na IA. */
export function montarPlano(p: PedidoPlano): string {
  const material = p.origem
    ? origemTexto({ origem: p.origem, texto: p.texto })
    : 'Não há material anexado: use conhecimento consolidado e correto, do que é ensinado em cursos regulares.'
  const nivel = infoNivel(p.nivel)
  const arquivo = p.origem === 'arquivo'
  const fonte = arquivo ? fonteDe('arquivo') : fonteDe('tema')
  const pedido = p.pedido.trim() || 'Não escrevi um pedido: monte o plano para estudar o que está no material anexado.'

  return `Você é um professor que monta um plano de estudo em flashcards para o app Filidilo. Responda SOMENTE com um bloco de código JSON (veja "Entrega"), exceto quando precisar fazer perguntas (ver "Antes de responder"${arquivo ? ' e "Antes de criar os cartões"' : ''}).

## Pedido
===
${pedido}
===

## Material
${material}
${nivel ? `\n## Quanto a pessoa já sabe\nNível "${nivel.nome}" (${nivel.valor}). ${nivel.instrucao}\nEsse nível foi escolhido pela própria pessoa: não mude. Ele manda na dificuldade e no tom de todos os cartões.\n` : ''}
## Antes de responder
Se o pedido for vago demais para montar um bom plano (não dá para saber o objetivo ou o recorte), faça até 3 perguntas curtas, numa mensagem só, e espere a resposta. Senão, responda direto.${arquivo ? ' Com material anexado, o pedido pode ser curto ou vazio: o material dá o recorte.' : ''}

## Planejar
- Interprete o objetivo da pessoa e escreva o objetivo em 1 frase.${nivel ? ` O nível é "${nivel.valor}".` : ' Escolha o nível entre "zero", "iniciante", "nocoes", "bastante", "expert" e "extremo".'}
- Defina o foco (de 2 a 5 itens) e, se houver, o que evitar.
- Crie de 3 a 8 temas, na ordem em que se aprende, cada um com uma frase de descrição.

## Cartões
${arquivo ? quantidadeArquivo() : 'Crie 15 cartões.'} Distribua os cartões pelos temas, começando pelos primeiros. Adeque a dificuldade ao nível da pessoa. Os tipos devem combinar com o assunto: "calculo" só se houver contas; para idiomas, use "conceito" e "associacao".

## Formato da resposta
Um objeto JSON com "baralho", "temas" e "cartoes":
{ "baralho": { "titulo": "...", "objetivo": "...", "nivel": "...", "foco": [ ... ], "evitar": [ ... ] }, "temas": [ { "id": "...", "nome": "...", "descricao": "..." } ], "cartoes": [ ... ] }
- "baralho.titulo": até 40 caracteres. "objetivo": 1 frase, até 160 caracteres. "nivel": um de "zero", "iniciante", "nocoes", "bastante", "expert" ou "extremo"${nivel ? ` (use "${nivel.valor}")` : ''}. "foco" e "evitar": até 5 itens, de até 60 caracteres cada.
- "temas[].descricao": até 120 caracteres.

${regrasTipos(fonte)}

${regraNaoEntregar()}

## Regras
- Português do Brasil (menos o conteúdo do idioma estudado, se for o caso). Uma ideia por cartão. Pergunta que se entende sozinha.
- ${arquivo ? 'Fiel ao material: não invente dados, valores ou fórmulas que não estejam nele.' : 'Fiel ao conhecimento consolidado: se não tiver certeza, não crie o cartão.'}
- Nada de spoilers, nem do que estiver em "evitar".
${regraPagina(p.origem)}${regrasTextoJson()}

## Exemplo (formato; não copie o conteúdo)
\`\`\`json
${JSON.stringify(EXEMPLO_PLANO, null, 1)}
\`\`\`
`
}
