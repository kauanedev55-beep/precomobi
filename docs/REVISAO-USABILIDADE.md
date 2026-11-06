# Revisão de usabilidade — PreçoMobi

Data: 05/11/2026. Escopo: navegação, separação de tarefas, estados de busca e fluxo no celular.

## Uma função clara por área

| Área | Função | Ações principais |
|---|---|---|
| Minha lista | Organizar a próxima compra, privada | Ajustar quantidades, comparar, salvar se quiser, reutilizar listas salvas |
| Produtos | Encontrar e identificar o que será comprado | Buscar, ler código, cadastrar produto ausente, adicionar à lista |
| Promoções | Consultar ofertas com prazo e condições | Filtrar pela cidade, conferir condições, confirmar ou sinalizar mudança |
| Comunidade | Consultar e confirmar preços comuns compartilhados | Filtrar produto/mercado, confirmar preço de outra pessoa, acessar contribuições pessoais |
| Informar preço | Enviar uma observação ao catálogo compartilhado | Selecionar produto, mercado, preço e indicar se é promoção |
| Minhas contribuições | Consultar os preços comuns enviados pela própria conta | Ver confirmações e acessar Minhas promoções |
| Avisos | Ver ofertas relevantes conforme escolhas pessoais | Escolher produtos/listas e mercados habituais; ativar ou desativar avisos |
| Mercados | Consultar unidades e abrir localização | Cidade, endereço e um acesso ao mapa; cadastro de unidade para administrador |
| Meu perfil | Identificação e acesso da conta | Consultar dados e sair da conta |

As quatro entradas principais continuam sendo Minha lista, Produtos, Promoções e Comunidade. Avisos ficam no sino. Mercados e perfil permanecem acessíveis pelo menu.

## Problemas encontrados e ajustes

| Problema | Ajuste no código |
|---|---|
| Visão geral repetia lista, ofertas e avisos | Tela retirada; endereço antigo /painel redireciona para /lista; marca abre a lista |
| Minhas contribuições tinha acesso duplicado no menu geral e na área Comunidade | Acesso principal mantido na navegação da Comunidade; atalho de conta preservado no perfil |
| Avisos mostrava botões e abas de publicação/histórico de promoções | Avisos agora apresenta preferências, resultados pessoais, atualizar e acesso às promoções da cidade |
| Formulário longo de preferências empurrava os avisos para baixo | Configuração fica recolhida, com título para expandir |
| Histórico pessoal de promoções usava explicação genérica da comunidade | Texto específico identifica envios próprios, vencidos e encerrados |
| Lista vazia tinha dois botões para a mesma busca | Uma ação de adicionar no estado vazio; ação no cabeçalho quando existem itens |
| Perfil, cadastro de produto e contribuições pessoais mostravam filtro de cidade sem efeito sobre o conteúdo | Seletor omitido nessas páginas; conservado nas telas que consultam preços e mercados por região |
| Colaboração exibia o catálogo inteiro antes de qualquer busca | Seleção limitada aos resultados pesquisados/lidos e ao produto contextual |
| Busca sem resultado na colaboração mantinha opções antigas | Resultados anteriores são limpos ao iniciar nova busca |
| Produto recebido por link podia não estar no primeiro lote do catálogo | Busca explícita do produto contextual para garantir sua seleção |
| Voltar de uma contribuição promocional levava sempre à Comunidade | Entrada por promoção retorna a Promoções |
| Código não encontrado podia perder os números no cadastro seguinte | Código lido preservado no acesso ao cadastro manual |
| Adição pelo catálogo mudava somente um pequeno ícone | Mensagem de sucesso anunciada e acesso à lista |
| Trocar de produto podia manter peso e sucesso do produto anterior | Estado de quantidade e adição reiniciado ao mudar o produto |
| Menu lateral podia permanecer aberto após navegação pelo histórico | Fecha ao mudar de página |

## Repetições preservadas por terem finalidade diferente

- Uma contribuição pessoal também aparece no histórico público: é o mesmo registro, visto pelo autor e pela comunidade, e não uma segunda compra. As telas explicam isso.
- Informar preço na ficha do produto é um atalho contextual para o mesmo formulário, não um segundo cadastro.
- Um aviso na lista aponta para as ofertas relevantes; detalhes e condições continuam em Avisos.
- Links de conta para listas e contribuições são atalhos. Não mantêm coleções diferentes.
- Promoções possuem validade e condições próprias; não substituem automaticamente os preços comuns da comparação.

## Validação e limites

- Dez testes auxiliares do frontend passaram; cobrem quantidades, valores, mensagens de cadastro, códigos e mapas.
- Compilação TypeScript e build Vite executados após os ajustes.
- Revisão feita no código. Não equivale a um teste observado com usuários nem a uma validação visual em um telefone real.
- Publicação continua pendente de autorização explícita para envio ao repositório público, conforme o bloqueio da revisão automática anterior. Nenhum envio foi tentado nesta revisão.

## Roteiro de teste em celular antes de liberar

1. Entrar e confirmar que a lista é a primeira tela; tocar na marca deve retornar a ela.
2. Adicionar três produtos, incluindo um por kg, e conferir o retorno à lista e o cálculo da comparação.
3. Buscar produto sem resultado na colaboração e conferir que nenhuma opção antiga permanece.
4. Abrir Informar preço pela ficha de um produto recém-cadastrado e conferir a seleção correta.
5. Publicar um preço comum e uma promoção em base de teste; conferir os destinos correspondentes e os históricos pessoais.
6. Com duas contas, confirmar que listas e preferências são privadas e que contribuições públicas estão corretamente identificadas.
7. Conferir Avisos antes/depois de ativar preferências; expandir configuração sem perder o contexto das ofertas.
8. Em larguras de 360, 390 e 430 pixels, conferir teclado, botões, rolagem, zoom de texto e a ausência de sobreposição da navegação inferior.
9. Pedir a uma pessoa do público-alvo que monte e compare uma lista sem explicações; observar hesitações, erros e tempo de conclusão.
