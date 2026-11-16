# Tatino — Plano de implementação da Fase 2

Cada etapa termina com testes passando, conferência no navegador em tamanho de celular e publicação na `main`.

| # | Etapa | Entrega | Depende de |
|---|---|---|---|
| E1 | **Vários baralhos** | Baralhos no IndexedDB; baralho de exemplo pré-instalado com o progresso mantido; tela Meus baralhos; configurar (nome, temas, prioritário, data da prova); duplicar e excluir | — |
| E2 | **Editor de cartões** | Formulário para conceito, V/F e alternativas; editar e excluir; "Colar lista"; marcação `editado` | E1 |
| E3 | **Compartilhar e atualizar** | Exportar `.tatino.json` pelo compartilhamento do Android; "Abrir baralho recebido"; atualização por id preservando as edições, com resumo | E1 |
| E4 | **Harness IA: copiar e colar** | Instruções versionadas; tela "Criar com IA" com o fluxo do app do Gemini; extração, validação, correção guiada e prévia | E1 |
| E5 | **Gemini direto** | Configurações com a chave; chamada à API com PDF e esquema de resposta; nova tentativa automática; volta ao copiar e colar quando falha | E4 |
| E6 | **Avaliação do harness** | Script que roda em PDFs de aula reais e relatório de qualidade; ajuste das instruções até ≥ 90% válidos | E5 + chave do Marcelo no terminal |
| E7 | *(opcional)* **Sincronização Google Drive** | Entrar com Google, sincronizar e mesclar | E1 + projeto Google Cloud do Marcelo |

## Riscos

| Risco | Mitigação |
|---|---|
| Migração perder o progresso do baralho existente | Teste automático da migração; backup automático antes de migrar |
| Gemini gerar cálculo com fórmula errada | Verificador sorteando 60 vezes, exemplo resolvido na prévia, tela Revisar conteúdo |
| Cota grátis do Gemini acabar | Volta automática ao copiar e colar |
| Chave do Gemini exposta | Fica só no aparelho; nunca vai para o repositório, logs ou backup exportado |
