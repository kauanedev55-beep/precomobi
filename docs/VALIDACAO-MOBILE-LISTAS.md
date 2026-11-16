# Correções do fluxo mobile de listas

## Comportamento proposto
- Salvar na cesta, em Minha lista ou na comparação usa o mesmo estado de salvamento por conta e rascunho.
- Salvar mantém os itens em edição. Alterar e salvar novamente atualiza a mesma lista com controle de revisão.
- Editar como nova preserva o rascunho anterior no arquivo local da conta e mantém a lista original.
- Promoções permitem escolher quantidade ou peso antes de adicionar, inclusive adicionar mais de um produto já presente.
- Resultados dos mercados aparecem antes do cálculo opcional de deslocamento.
- Produtos da comparação ficam em detalhes; no celular, cada produto é apresentado verticalmente, sem exigir uma tabela larga.

## Validação necessária antes da publicação
1. Executar npm --prefix frontend test e npm --prefix frontend run build.
2. Em 320, 360, 390 e 430 px: adicionar arroz (2 unidades) e batata (0,750 kg) pela busca e por uma promoção. Conferir quantidades na cesta.
3. Salvar pela cesta, mudar para Minha lista, alterar quantidade e salvar: conferir que não foi criada uma cópia e que os itens continuam abertos.
4. Comparar e salvar: voltar para edição, verificar que os itens permanecem e que a lista salva corresponde às quantidades.
5. Editar uma lista salva como nova com um rascunho em andamento. Recuperar o rascunho em Rascunhos anteriores; verificar nome, quantidades e marcações.
6. Simular falha de rede ao salvar: manter itens e permitir nova tentativa. Validar rejeição de revisão antiga sem sobrescrever mudanças externas.
7. Abrir comparação completa e incompleta: conferir totais, cobertura, origem, validade, detalhes verticais, rota e cálculo opcional de deslocamento.
8. Conferir Android/Chrome e iPhone/Safari, teclado aberto, rotação, zoom e navegação por leitor de tela.
9. Trocar de conta: verificar separação de rascunhos e estado de salvamento.

A revisão por código não substitui o teste com aparelhos e pessoas. O ambiente local estava indisponível durante a preparação; consultar os resultados do CI para testes executados.
