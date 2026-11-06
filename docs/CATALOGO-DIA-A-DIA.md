# Catálogo do dia a dia

## O que foi preparado

Uma seleção inicial de 25 produtos do catálogo público do Extrabom, rede já cadastrada no PreçoMobi. O manifesto `backend/app/db/daily_catalog.json` associa cada item à página de origem e à URL de sua foto. Nenhuma imagem foi gerada ou substituída por uma embalagem parecida.

- Hortifruti é identificado pelo alimento e variedade. Batata inglesa e batata-doce são dois produtos; batata frita e batata palha não entram nessa pesquisa básica.
- Produtos embalados preservam marca e conteúdo exatos, como feijão Juju 1 kg e café Cafuso 500 g. O objetivo da seleção é reduzir repetições, sem transferir preços entre marcas.
- Fotos são referenciadas nos servidores de origem, com crédito e link nas telas. Os links responderam como imagens na conferência inicial. Se uma imagem falhar posteriormente, a tela retira o espaço da foto.
- A imagem de um alimento fresco não representa uma marca ou garantia de estoque em todas as filiais. Preços de outras regiões ou condições de clube não foram importados.

## Busca e lista

A busca principal usa os produtos selecionados e também permite encontrar produtos sem marca cadastrados pela comunidade. Reconhece singular, plural e acentos nos termos básicos, como batata/batatas, feijão/feijões e café/cafe. A aba Marcas e embalagens mantém o acesso ao catálogo anterior e aos produtos específicos. A leitura de códigos continua identificando a embalagem exata.

Frutas e legumes vendidos por peso usam 1 kg como referência. A pessoa informa o peso que pretende levar. Ovos em dúzia preservam o conteúdo de 12 unidades e o preço é o de uma caixa. Os preços de produtos anteriores não são associados automaticamente aos novos itens.

## Preservação e publicação

A preparação só acrescenta metadados e produtos. A migração tem marcador para não executar duas vezes; não apaga registros, listas nem observações de preço. A seleção não declara disponibilidade em cada unidade.

Esta entrega reúne a busca simplificada e o catálogo inicial. Os produtos são acrescentados pela migração ao iniciar a API atualizada. O agente de monitoramento fica fora desta entrega; sua ampliação para todos os mercados será uma etapa futura.

## Referências verificadas

- https://www.extrabom.com.br/c/hortifruti/1/
- https://www.extrabom.com.br/c/legumes/6/
- https://www.extrabom.com.br/p/batata-inglesa-unidade/1490/
- https://www.extrabom.com.br/p/batata-doce-unidade/1475/
- As páginas de cada item e suas fotos constam no manifesto.
