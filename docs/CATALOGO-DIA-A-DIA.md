# Catálogo do dia a dia

## O que foi preparado

Uma seleção inicial de 25 produtos do catálogo público do Extrabom, rede já cadastrada no PreçoMobi. O manifesto `backend/app/db/daily_catalog.json` associa cada item à página de origem e à URL de sua foto. Nenhuma imagem foi gerada ou substituída por uma embalagem parecida.

- Hortifruti é identificado pelo alimento e variedade. Batata inglesa e batata-doce são dois produtos; batata frita e batata palha não entram nessa pesquisa básica.
- Produtos embalados preservam marca e conteúdo exatos, como feijão Juju 1 kg e café Cafuso 500 g. O objetivo da seleção é reduzir repetições, sem transferir preços entre marcas.
- Fotos são referenciadas nos servidores de origem, com crédito e link nas telas. Os links responderam como imagens na conferência inicial. Se uma imagem falhar posteriormente, a tela retira o espaço da foto.
- A imagem de um alimento fresco não representa uma marca ou garantia de estoque em todas as filiais. Preços de outras regiões ou condições de clube não foram importados.

## Busca e lista

A busca principal prioriza os tipos selecionados; quando não encontra correspondência, consulta o catálogo local. Reconhece singular, plural e acentos nos termos básicos, como batata/batatas, feijão/feijões e café/cafe. A busca específica por marcas e embalagens fica em Mais opções. A leitura de códigos continua identificando a embalagem exata.

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


## Ampliação de folhas, verduras, frutas e legumes — 06/11/2026

O manifesto `backend/app/db/daily_produce_expansion.json` acrescenta 58 referências do próprio catálogo Extrabom: 22 verduras/folhas/temperos frescos, 27 frutas e 9 legumes. A seleção usa as seções Folhagens, Ervas e Temperos Frescos, Verduras, Frutas (páginas 1–3) e Legumes Frescos (páginas 1–2). Cada registro preserva a página e o nome de origem.

- Alface americana já existente é mantida; entram mimosa e roxa, além de couve, rúcula, espinafre, agrião, taioba, mostarda, almeirões e chicória/escarola. Não foram criadas variedades inferidas apenas pela foto.
- Frutas incluem maçãs fuji/gala/verde, mangas tommy/palmer, laranjas pera/lima/bahia, abacaxi, abacate, mamão formosa, melão amarelo, goiaba, pera, kiwi, maracujá e outras. Não se repete o mesmo alimento para cada embalagem de fornecedor.
- Morango e uvas preservam o peso das bandejas; couve-flor preserva a apresentação de 300 g. Rabanete, folhas e abacaxi usam unidade conforme a origem. Os demais produtos por quilo usam 1 kg de referência, não o peso aproximado de cada peça da foto.
- As 58 imagens responderam e foram decodificadas como imagens na conferência. As fotos de alface mimosa, alface roxa e rúcula também foram inspecionadas visualmente. Fotos continuam hospedadas na origem e podem mudar posteriormente.
- “Folhas”, “folhagens” e “folhosas” localizam as folhas; “salsinha” encontra salsa; “tangerina” e “bergamota” encontram mexerica. A busca não mistura couve-flor com o grupo das folhas.
- A migração é aditiva e idempotente. Não transfere preços dos produtos anteriores nem importa estoque, preço ou condições de outra região. Cidades e lojas continuam sendo as da aplicação.

Fontes: https://www.extrabom.com.br/c/folhagens/24/ ; https://www.extrabom.com.br/c/ervas-temperos-frescos/363/ ; https://www.extrabom.com.br/c/verduras/25/ ; https://www.extrabom.com.br/c/frutas/2/ ; https://www.extrabom.com.br/c/legumes-frescos/1687/ .


## Produtos de limpeza — 06/11/2026

`backend/app/db/daily_cleaning_catalog.json` acrescenta 19 produtos da rede Extrabom, consultando as listas oficiais Limpeza Essencial da Semana e Limpeza da Casa Completa e as categorias de sabão, desinfetantes, multiuso, esponjas, álcool e acessórios.

São referências reais para detergente, água sanitária, sabão em pó/líquido/barra, amaciante, desinfetante, multiuso, limpador cremoso, álcool, esponjas, pano multiuso, luvas, saco de lixo, vassoura, rodo, pá e pano de chão. Marca, variante e conteúdo são preservados; não se cria um preço genérico que misture produtos diferentes. Não foram importados descontos de listas, valores de exemplo ou preços de outra cidade.

Todos são vendidos por embalagem/unidade: 500 ml de detergente é o conteúdo de uma garrafa, não 500 unidades da lista. O saco de lixo de capacidade 50 L tem 30 sacos no pacote; sua quantidade de conteúdo é 30 un, não 50 L. O sabão em pó tem 2,2 kg por pacote. As 19 fotos foram recebidas e decodificadas; detergente, sabão em pó e saco de lixo também passaram por inspeção visual. Fotos são referências do catálogo, sem garantia de estoque em cada filial.

A carga tem marcador próprio e é idempotente, preservando produtos, observações de preços, mercados e listas existentes. Não exige nova API, serviço pago ou alteração na estrutura das telas. Os itens são encontrados na busca única pelo nome, marca ou “limpeza”.

Fontes: https://www.extrabom.com.br/lista-de-compras/limpeza-essencial-da-semana/73/ ; https://www.extrabom.com.br/lista-de-compras/limpeza-da-casa-completa/72/ ; páginas individuais no manifesto.
