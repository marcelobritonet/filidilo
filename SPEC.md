# Tatino — Especificação da Fase 1

App de flashcards para uma estudante se preparar para a prova de Hidrodinâmica / Fenômenos de Transporte (curso náutico) de **quinta, 19/11/2026**.

## 1. Público e uso

- **Quem estuda:** uma estudante, no celular Android, sem conhecimento de programação. Tudo tem que ser óbvio no primeiro uso.
- **Quem revisa o conteúdo:** Claude confere cada cartão contra a apostila. Marcelo e a estudante revisam juntos pelo próprio app (seção 6).
- **Onde roda:** PWA em português, instalável pelo Chrome no Android ("Adicionar à tela inicial"). Funciona 100% offline depois do primeiro acesso. Não tem login.

## 2. Plataforma

| Item | Decisão |
|---|---|
| Tecnologia | Vite + TypeScript + Preact, com `vite-plugin-pwa` (service worker) |
| Armazenamento | Banco interno do navegador (IndexedDB, via Dexie), com `navigator.storage.persist()` para o Android não apagar os dados |
| Fórmulas | KaTeX |
| Hospedagem | GitHub Pages, repositório público `tatino`, publicado por GitHub Actions |
| Atualização | Quando sai uma nova versão, aparece o aviso "Nova versão disponível — Atualizar". O progresso é mantido porque o `id` de cada cartão nunca muda. |
| Sincronização | Nenhuma. Botão de backup (seção 7). |

## 3. Telas

| Tela | O que faz |
|---|---|
| **Início** | Progresso por tema (barra) e três botões grandes: **Modo prova**, **Revisão espaçada** e **Exercícios de cálculo**. Menu com Revisar conteúdo e Backup. |
| **Estudo** | Um cartão por vez: tocar para virar e depois avaliar com **Errei / Difícil / Acertei / Fácil**. Todo cartão tem o botão **⚠ Reportar erro**. |
| **Exercício de cálculo** | Enunciado com números sorteados, campo numérico com a unidade, botão **Conferir**. Mostra certo ou errado e a resolução passo a passo. Botão **Novo sorteio**. |
| **Revisar conteúdo** | Lista de todos os cartões por tema, com a fonte (apostila e página). Marca cada um como ✓ ok, ⚠ erro ou 📝 nota. Tem o filtro "Reportados". |
| **Backup** | Exportar e importar um arquivo de progresso, e **Enviar reportes** (compartilhar texto pelo WhatsApp ou e-mail). |

## 4. Modos de estudo

- **Modo prova (o principal até quinta):** ignora as datas de revisão. A sessão tem 20 cartões nesta ordem: errados recentemente, depois nunca vistos dos temas prioritários, depois os demais prioritários, depois o resto. A estudante pode filtrar por tema.
- **Revisão espaçada:** usa o FSRS (biblioteca `ts-fsrs`) com os 4 botões de avaliação. Mostra os cartões vencidos e os novos.
- **Exercícios de cálculo:** sorteia um gerador (ou o tema escolhido). Acertou conta como "Acertei" no FSRS; errou conta como "Errei".

Temas prioritários: centrípeta e Coriolis · marés e tábua de marés · estabilidade direcional e manobras · squat e folga sob a quilha · camada limite e Pitot · Reynolds e regimes.

## 5. Conteúdo

### 5.1 Tipos de cartão

| Tipo | Frente | Verso / interação |
|---|---|---|
| `conceito` | Pergunta | Resposta e explicação |
| `vf` | Afirmação | Toca em V ou F, e o app mostra o certo e o porquê |
| `associacao` | Pergunta com 3 a 5 opções | Toca numa opção, e o app mostra a correta e o porquê |
| `calculo` | Enunciado com números sorteados | Resultado digitado, conferido com tolerância de ±2%, e a resolução |

### 5.2 Distribuição (~200 cartões)

| Tema | Cartões |
|---|---|
| Centrípeta e Coriolis | 30 |
| Marés e tábua de marés | 30 |
| Estabilidade direcional e manobras (IMO A.751) | 30 |
| Squat e folga sob a quilha | 25 |
| Camada limite e Pitot | 25 |
| Reynolds e regimes | 20 |
| Demais temas (Bernoulli, resistência ao avanço, fluidos, propulsão, ondas, sustentação e estol) | 40 |

Todo cartão traz a `fonte` (apostila e página). As apostilas em PDF **não** vão para o repositório.

### 5.3 Geradores de cálculo

As fórmulas e os limites abaixo serão conferidos contra as apostilas antes de implementar.

| Gerador | Sorteia | Pede | Fórmula |
|---|---|---|---|
| Squat e folga | Cb, V (nós), profundidade, calado, local (canal ou águas abertas) | Squat (m), folga sob a quilha (m) e se é segura | S = 2·Cb·V²/100 (canal) ou Cb·V²/100 (aberto); folga = profundidade − calado − S |
| Centrípeta | m, V ou ω, R | ac ou Fc | ac = V²/R = ω²R; Fc = m·ac |
| Camada limite | V, x, ν | Reₓ, regime e δ | Reₓ = Vx/ν; laminar δ = 5x/√Reₓ; turbulenta δ = 0,37x/Reₓ^0,2 |
| Pitot | Δp ou h do manômetro, ρ, ρm | V | V = √(2Δp/ρ); Δp = (ρm − ρ)·g·h |
| Reynolds | V, D, ν (ou ρ e μ) | Re e o regime | Re = VD/ν; limites de regime conforme a apostila |

### 5.4 Formato do baralho (JSON)

```json
{
  "id": "hidrodinamica", "titulo": "Hidrodinâmica", "versao": 1,
  "temas": [{ "id": "squat", "nome": "Squat e folga sob a quilha", "prioritario": true }],
  "cartoes": [
    { "id": "sq-001", "tipo": "vf", "tema": "squat",
      "frente": "O squat aumenta com o quadrado da velocidade.", "resposta": true,
      "explicacao": "S ∝ V².", "fonte": { "apostila": "1.2-Conceituar efeito SQUAT", "pagina": 3 } },
    { "id": "sq-calc-01", "tipo": "calculo", "tema": "squat",
      "enunciado": "Navio com Cb = {Cb} a {V} nós em canal restrito. Qual o squat?",
      "parametros": { "Cb": { "min": 0.6, "max": 0.85, "passo": 0.01 },
                      "V":  { "min": 6, "max": 14, "passo": 0.5, "unidade": "nós" } },
      "resultado": { "expr": "2*Cb*V^2/100", "unidade": "m", "casas": 2 },
      "passos": ["S = 2·Cb·V²/100", "S = 2·{Cb}·{V}²/100 = {resultado} m"],
      "tolerancia": 0.02, "fonte": { "apostila": "2.6-Conceituar efeito SQUAT", "pagina": 4 } }
  ]
}
```

As expressões são avaliadas por um **avaliador matemático seguro** (sem `eval`), o que deixa a importação de baralhos de terceiros, na fase 2, protegida desde já.

## 6. Revisão de conteúdo a três

| Quem | Como |
|---|---|
| Claude | Confere fórmulas, números e afirmações contra as apostilas, e cita a página em cada cartão |
| Estudante | Reporta erros enquanto estuda (⚠) e envia os reportes pelo WhatsApp |
| Marcelo | Abre o app no próprio aparelho, em **Revisar conteúdo**, ou revisa com ela no celular dela. Os reportes recebidos são repassados ao Claude, que corrige e publica uma versão nova. |

## 7. Dados no aparelho

- Estado FSRS por cartão.
- Histórico de revisões só por acréscimo (`cartao`, `nota`, `data`, `aparelho`). Isso deixa a sincronização da fase 2 simples.
- Reportes e marcações da revisão de conteúdo.
- O backup é um único arquivo `.json` com tudo isso.

## 8. Fora da fase 1

Criar e editar cartões no app, importar PDF (F3), sincronização (F4), vários baralhos, notificações.

## 9. Pronto quando

1. Instala no Android e abre em modo avião.
2. Modo prova, revisão espaçada e exercícios funcionam com os ~200 cartões e os 5 geradores.
3. Os geradores passam em testes automáticos contra exemplos resolvidos das apostilas.
4. Reportar, revisar conteúdo, enviar reportes e backup/restauração funcionam.
5. Uma atualização publicada preserva o progresso.
