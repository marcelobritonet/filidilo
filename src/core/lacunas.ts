/** Marcador de lacuna no texto de um cartão de lacunas. */
export const MARCADOR = '____'

/** Quantas lacunas a frase tem. */
export function contarLacunas(frente: string): number {
  return frente.split(MARCADOR).length - 1
}

/** Partes do texto entre as lacunas: uma a mais que o número de lacunas. */
export function partesDaFrente(frente: string): string[] {
  return frente.split(MARCADOR)
}

/** Formas aceitas de uma resposta: "Sol/astro-rei" vira ["Sol", "astro-rei"]. */
export function formasAceitas(resposta: string): string[] {
  return resposta.split('/').map((s) => s.trim()).filter(Boolean)
}

/** A frase com as respostas no lugar das lacunas (texto puro, para revisão e mensagens). */
export function fraseCompleta(frente: string, respostas: string[]): string {
  const partes = partesDaFrente(frente)
  return partes.reduce((acc, p, i) => acc + p + (i < respostas.length ? formasAceitas(respostas[i])[0] ?? '' : ''), '')
}

/** Níveis em que a lacuna vem com alternativas (fácil). Nos demais, a pessoa só revela. */
export const NIVEIS_COM_ALTERNATIVAS = ['zero', 'iniciante', 'nocoes'] as const
