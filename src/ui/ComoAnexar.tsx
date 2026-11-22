/** Como pedir à IA quando o material é um arquivo: uma frase e, em "Saiba mais", os detalhes. */
export function ComoAnexar({ continuar = false }: { continuar?: boolean }) {
  return (
    <div class="como-anexar">
      <p class="dica">
        {continuar
          ? 'Copie o pedido e cole na mesma conversa em que você já mandou o arquivo.'
          : 'Copie a instrução, cole na IA e anexe lá o PDF ou a imagem.'}
      </p>
      <details>
        <summary>Saiba mais</summary>
        <ul>
          <li>O arquivo vai para a IA, não para o Filidilo. Anexe pelo botão + (ou clipe 📎) da IA.</li>
          <li>A IA conta o que leu e pergunta que parte usar e quantos cartões criar. Responda lá e cole aqui a resposta final.</li>
          <li>Para anexar, o Gemini e o ChatGPT pedem que você entre na conta (a grátis basta). Sem conta, use a opção Texto.</li>
          <li>Muitas páginas ou imagens podem esbarrar no limite do plano grátis. Se travar, mande em partes.</li>
          <li>Quer mais cartões do mesmo arquivo? Volte à mesma conversa: não precisa anexar de novo.</li>
        </ul>
      </details>
    </div>
  )
}
