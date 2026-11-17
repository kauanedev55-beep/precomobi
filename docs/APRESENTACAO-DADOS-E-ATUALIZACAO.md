# PreçoMobi: dados reais e atualização

## Fala técnica para a banca

“O frontend foi desenvolvido em React e consulta uma API em FastAPI. A API acessa o banco PostgreSQL no Supabase. O catálogo identifica produtos e apresentações; os registros de preço relacionam produto e loja e guardam valor, unidade de venda, data, origem e validade. As promoções têm suas próprias condições, como clube e quantidade mínima.

Nesta entrega, os dados de folhetos públicos foram conferidos e importados. O cadastro administrativo também permite registrar um preço comum verificado sem criar uma promoção. A administradora também pode atualizar preços pelo formulário do sistema. A API valida produto, loja, unidade, fonte e validade antes de gravar. A prévia não publica nada. A publicação exige perfil de administradora e revisão explícita.

Na comparação, o sistema procura o registro mais recente e ainda válido para cada produto em cada loja. Multiplica o preço pela quantidade ou peso da lista usando valores decimais. Mercados sem preço para nenhum item ficam fora do resultado. Quando falta o preço de um item, a compra é identificada como parcial e não concorre como o menor total completo. O preço com clube não substitui automaticamente o preço comum.”

## Atualização pela conta administradora

1. Entrar com a conta master e abrir Mais opções → Atualizar preços, ou Meu perfil → Atualizar preços.
2. Consultar o folheto oficial e conferir a apresentação exata e a loja participante.
3. Buscar o produto cadastrado e escolher cidade e unidade. Não aplicar o preço a toda a rede sem confirmação no folheto.
4. Informar preço sem clube, eventual desconto de clube, início/fim de validade, link da fonte e condições.
5. Para um preço comum, deixe “É uma promoção” desmarcado. Somente marque quando o valor também deva aparecer em Promoções. Escolher Conferir antes de publicar. Revisar a prévia, marcar a conferência e publicar.
6. Voltar a Produtos, Promoções ou Comparação e atualizar a consulta. A publicação não exige novo deploy.

A importação por arquivo continua disponível em “Importar vários preços por arquivo”. O relatório de descoberta de folhetos do coletor não é um arquivo de preços pronto para publicar.

## Limites que devem ser apresentados com clareza

- Não há integração comercial contratada com os supermercados nem um robô diário publicando preços automaticamente.
- O coletor existente auxilia a encontrar folhetos; os valores ainda precisam de revisão humana.
- Cadastrar um produto ou uma loja não cria preços. A cobertura desta versão é parcial.
- Os preços atuais revisados vêm de Carone, Sempretem, Extrabom e Supermercados BH, conforme validade e abrangência registradas. Uma rede pode ter lojas sem preço para os produtos escolhidos.
- Ofertas vencidas saem da consulta ativa automaticamente. Isso não significa que o sistema foi ao site buscar um preço novo.
- A opção “Mostrar somente produtos com preço na cidade” ajuda a construir uma compra comparável. Desmarcar permite usar o aplicativo apenas como lista.
- Nenhum sistema de catálogos garante estoque ou que uma loja não tenha alterado o preço depois da conferência.

## Demonstração com uma comparação de fato disponível

Na conferência pública de 17/11/2026, o produto “Carré suíno serrado e congelado (por quilo)” tinha preço comum de R$ 15,99/kg em Carone Laranjeiras/Jardim Limoeiro (até 28/11) e R$ 14,69/kg em Sempretem Jacaraípe/Jardim Limoeiro (até 21/11). Para 2 kg, os subtotais são R$ 31,98 e R$ 29,38; a diferença é R$ 2,60. Confira novamente antes da apresentação. A seleção é do mesmo produto, sem marca e por kg, já revisado nos folhetos, não uma equivalência automática entre embalagens diferentes.

Demonstre: escolher Serra → abrir Produtos → buscar “carré” → adicionar 2 kg → conferir a cesta → comparar → ver origem/validade → escolher uma unidade e abrir sua rota. Esse exemplo valida um produto; não prova cobertura integral de uma cesta de supermercado.


## Preço comum não é sinônimo de promoção

O formulário administrativo começa como preço comum. A publicação grava uma observação de origem `admin_verified`, elegível para a comparação, e não cria uma oferta. Com “É uma promoção” marcado, o fluxo também publica em Ofertas. Desconto de clube exige promoção e não substitui o valor comum no cálculo padrão.

A busca por produtos com preços, por si só, não fornece cobertura de uma compra inteira. Na conferência de 17/11 em Serra havia 29 produtos com preço distribuídos por 13 lojas de 4 redes; não são 29 preços em cada unidade. A aplicação precisa continuar recebendo dados por produto e loja para cobrir uma cesta maior.

A consulta ao catálogo público do Carone retornou identificações de produtos, mas vários registros estavam com preço zero/sem estoque e sem confirmação da unidade física. O site do Extrabom consultado estava vinculado à loja Boulevard por padrão. Nenhum desses preços online foi copiado para lojas físicas da Serra. Ambos informam que valores da internet podem diferir das lojas físicas:

- https://www.carone.com.br/
- https://www.extrabom.com.br/atendimento/

Para ampliar preços comuns de loja física com confiabilidade, é necessário alimentar o cadastro com dados verificados por unidade, receber uma tabela do mercado ou ter integração que confirme esse escopo. O catálogo de nomes/fotos não fornece automaticamente os preços de todas as lojas.
