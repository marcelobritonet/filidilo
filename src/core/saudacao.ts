// Topo de Meus baralhos: saudação pela hora e uma frase com o que espera a pessoa hoje.

export type DadosDoDia = {
  /** Baralhos ativos, com quantos cartões já vistos vencem hoje (o mesmo número do "para revisar hoje" do botão Estudar). */
  baralhos: { titulo: string; revisar: number }[]
  hojeFeito: boolean
  sequencia: number
}

type Periodo = 'manha' | 'tarde' | 'noite'
const periodo = (agora: Date): Periodo => {
  const h = agora.getHours()
  if (h >= 5 && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  return 'noite'
}

export function saudacao(agora: Date): string {
  return { manha: 'Bom dia', tarde: 'Boa tarde', noite: 'Boa noite' }[periodo(agora)]
}

export function fraseDoDia(dados: DadosDoDia, agora: Date): string {
  if (!dados.baralhos.length) return 'Que tal aprender uma coisa nova hoje?'
  if (dados.hojeFeito)
    return dados.sequencia >= 2 ? `Hoje já está garantido: ${dados.sequencia} dias seguidos. Bom trabalho!` : 'Hoje já está garantido. Bom trabalho!'
  const mais = dados.baralhos.reduce((a, b) => (b.revisar > a.revisar ? b : a))
  if (mais.revisar > 0) return `${mais.revisar} ${mais.revisar === 1 ? 'cartão' : 'cartões'} para revisar hoje em ${mais.titulo}.`
  return { manha: 'Tenha uma manhã boa de estudo.', tarde: 'Tenha uma tarde boa de estudo.', noite: 'Tenha uma noite boa de estudo.' }[periodo(agora)]
}
