# Cesta durante a pesquisa

A pesquisa de produtos e os detalhes agora têm uma barra fixa que acompanha a lista em edição. Ela informa o número de produtos diferentes, sem somar embalagens com quilos e sem mostrar um total de preços. Após adicionar ou aumentar uma quantidade, mostra por quatro segundos o produto alterado e a quantidade que está na lista.

No celular (até 820 px), tocar na barra abre a cesta pela parte inferior, acima do conteúdo. Recolher pela alça, arrastar a alça para baixo ou tocar em “Continuar buscando” devolve à mesma pesquisa e mantém a rolagem. A barra fica acima do menu inferior e considera a área segura do aparelho. No computador, a cesta abre pela direita. A parte dos produtos tem rolagem própria e as ações ficam no rodapé. Em telas baixas, o rodapé fica mais compacto.

Dentro da cesta há fotos, nome e apresentação, controle de quantidade/peso, remoção e “Já peguei”. Fotos indisponíveis têm um ícone de apoio, mantendo o nome legível. A lista principal também permite marcar produtos. Adicionar novamente um produto já marcado aumenta sua quantidade e desmarca “Já peguei”, indicando que há mais a buscar.

“Salvar lista” funciona sem escolher cidade ou comparar preços. Guarda produtos, quantidades e marcações na conta; mantém a cesta em edição para continuar buscando. Durante a mesma sessão da cesta, novos salvamentos atualizam a mesma lista, evitando cópias repetidas. Depois de sair das telas de pesquisa/detalhes, um novo salvamento inicia uma nova lista. As listas anteriores não são alteradas automaticamente.

“Comparar mercados” é opcional e continua usando a região selecionada e os preços das lojas cadastradas. A cesta não calcula total em reais. O rascunho agora é recuperável neste aparelho, com a opção de continuar ou criar outra lista; veja `LISTAS-FAMILIA-E-FOLHETOS.md`. Salvar na conta permite acessar em outros aparelhos.

## Implementação e validação

Usa o diálogo nativo para foco, navegação por teclado, Escape e bloqueio do conteúdo de fundo. Ao fechar, o foco volta à barra. Há aviso acessível das adições, redução de movimento e botões de pelo menos 44 px nos controles. A animação é apenas de abertura; o gesto de recolher é reconhecido na alça, preservando a rolagem normal dos produtos.

A API aceita `is_purchased` no salvamento e expõe `PUT /api/shopping-lists/{id}` para atualizar uma lista da própria conta. Usa tabelas e campos já existentes; não há migração de estrutura nem serviço adicional. IDs de produtos, preços e mercados não são modificados pela atualização.

Testes verificam quantidades fracionárias, marcações, desmarcação ao adicionar mais, envio das marcações, salvamento sem cidade, atualização sem duplicar listas, validação antes de alterar e bloqueio entre contas. Verificação de tipos e build do frontend também foram executados. O navegador conectado não estava disponível nesta sessão, portanto gestos e aparência em aparelho físico não foram verificados.

## Seleção direta nos resultados

Cada resultado da pesquisa permite informar peso ou quantidade e tocar em “Adicionar”, sem abrir uma tela intermediária. Produtos por quilo aceitam vírgula e até três casas decimais; embalagens/unidades exigem inteiros. O cartão mostra confirmação breve e bloqueia toques repetidos por 1,2 segundo. O nome continua abrindo os detalhes como ação opcional. O código de barras preenche a pesquisa e usa o mesmo controle de quantidade. A cesta acompanha as adições sem trocar a busca.
