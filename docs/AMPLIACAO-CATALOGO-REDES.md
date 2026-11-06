# Ampliação do catálogo — Extrabom e Carone

Conferência em 06/11/2026. O manifesto `backend/app/db/daily_retail_catalog.json` acrescenta 484 produtos selecionados a partir das páginas públicas dos dois mercados. São 119 referências do Carone e 365 do Extrabom. Não é uma cópia integral dos milhares de produtos das duas redes.

## Cobertura desta rodada

| Categoria da aplicação | Novos produtos |
|---|---:|
| Bebidas | 69 |
| Doces | 64 |
| Frutas | 1 |
| Grãos | 25 |
| Higiene | 26 |
| Laticínios | 82 |
| Legumes | 3 |
| Limpeza | 99 |
| Massas | 14 |
| Mercearia | 86 |
| Padaria | 13 |
| Verduras | 2 |

A consulta percorreu seções de mercearia, arroz, feijão, farinhas, massas, café, óleos, conservas, leites, iogurtes, manteigas, requeijões, bebidas, doces, pães, hortifruti, higiene e limpeza. A seleção distribui espaço entre marcas. A primeira página de sabão em pó do Carone não mudou ao receber `page=1`; ela foi deduplicada e não foi contabilizada como uma segunda página de produtos.

Limpeza inclui limpadores perfumados Veja, Ajax, Casa & Perfume, Uau, Limpol, Coala e Secar; produtos para pisos de Azulim e Destac; e mais marcas de sabão em pó, como Omo, Brilhante, Surf, Tixan Ypê, Urca e Invicto. A classificação facilita a busca, sem afirmar que um produto é adequado para qualquer material de piso. Vale a indicação de uso do rótulo.

## Identidade e fotos

Cada registro contém o nome de origem, a página do produto, marca, unidade de venda, conteúdo e foto da própria rede. O Carone fornece esses metadados nas páginas públicas; no Extrabom foram lidos os cartões de produtos. Preços, ofertas, CEP, estoque e condições de clube dos sites não entram na base. Os valores continuam sendo observações dos mercados e cidades da aplicação.

Foram retirados produtos já identificados, repetições de nome/variante/tamanho e referências com tamanho ou apresentação ambíguos. A apresentação genérica é “Embalagem” quando a fonte não identifica claramente lata, caixa ou outro recipiente. Não se supõe uma garrafa só porque o conteúdo está em ml.

Multipacks explícitos preservam o conteúdo total: 6 x 350 ml = 2.100 ml; 4 x 500 ml = 2.000 ml. O conteúdo de proteína de uma bebida (15 g) não substitui o conteúdo da embalagem (250 ml). O Chamyto de 450 g foi conferido visualmente: são seis unidades de 75 g. Chicletes, sabonetes e creme dental com contagem ambígua não foram incluídos.

Todos os links de imagem incluídos passaram por resposta HTTP 200 e tipo de conteúdo de imagem; parte das imagens também foi baixada e decodificada. Coala Lima-Limão, Omo Puro Cuidado e Chamyto tiveram a foto inspecionada visualmente. Isso não constitui inspeção visual individual de todos os produtos e os arquivos de origem podem mudar.

A busca aceita “limpador de chão” e “limpador de piso” para os perfumados, e “sabão em pó” também encontra produtos nomeados como “lava-roupas em pó”. A categoria Doces está disponível na busca e no cadastro manual. A foto ampliada identifica Carone ou Extrabom como origem, com link para a página.

## Preservação

A carga usa o mecanismo de migração aditiva existente, com marcador próprio. Não apaga nem relabela produtos anteriores, não transfere preços entre marcas/tamanhos e não modifica mercados ou cidades. Não foi acrescentado serviço pago, assinatura, rotina diária ou agente automático.

## Páginas consultadas

- https://www.extrabom.com.br/c/arroz/64/
- https://www.extrabom.com.br/c/feijao/165/
- https://www.extrabom.com.br/c/acucar/1534/
- https://www.extrabom.com.br/c/cafes/1544/
- https://www.extrabom.com.br/c/farinhas-graos-secos/106/
- https://www.extrabom.com.br/c/oleos/1563/
- https://www.extrabom.com.br/c/massas/1570/
- https://www.extrabom.com.br/c/molhos-para-massas/1572/
- https://www.extrabom.com.br/c/biscoitos/91/
- https://www.extrabom.com.br/c/conservas-enlatados/34/
- https://www.extrabom.com.br/c/leite-longa-vida/1575/
- https://www.extrabom.com.br/c/leite-em-po/1576/
- https://www.extrabom.com.br/c/iogurtes-bebidas-lacteas/1673/
- https://www.extrabom.com.br/c/manteigas-margarinas/1674/
- https://www.extrabom.com.br/c/requeijao-cremes-de-queijo/1675/
- https://www.extrabom.com.br/c/leite-condensado-creme-de-leite/1554/
- https://www.extrabom.com.br/c/refrigerantes/1623/
- https://www.extrabom.com.br/c/suco-nectar/393/
- https://www.extrabom.com.br/c/aguas/1621/
- https://www.extrabom.com.br/c/achocolatados/1583/
- https://www.extrabom.com.br/c/chocolates-bombons/1548/
- https://www.extrabom.com.br/c/doces-compotas-de-frutas/1556/
- https://www.extrabom.com.br/c/gelatinas-pudins/1558/
- https://www.extrabom.com.br/c/balas-chicletes/1551/
- https://www.extrabom.com.br/c/paes-de-forma-torradas/1495/
- https://www.extrabom.com.br/c/lava-roupas/1514/
- https://www.extrabom.com.br/c/lava-roupas/1514/?page=2
- https://www.extrabom.com.br/c/limpadores-multiuso/1515/
- https://www.extrabom.com.br/c/limpadores-multiuso/1515/?page=2
- https://www.extrabom.com.br/c/desinfetantes/1517/
- Indisponível nesta consulta: https://www.extrabom.com.br/c/detergente/1526/ — a rede retornou limite de requisições; não houve repetição automática.
- Indisponível nesta consulta: https://www.extrabom.com.br/c/amaciantes/1512/ — a rede retornou limite de requisições; não houve repetição automática.
- https://www.extrabom.com.br/c/agua-sanitaria/1531/
- https://www.extrabom.com.br/c/sabonetes/1610/
- https://www.extrabom.com.br/c/cremes-dentais/1616/
- Indisponível nesta consulta: https://www.extrabom.com.br/c/papeis-higienicos/243/ — a rede retornou limite de requisições; não houve repetição automática.
- https://www.carone.com.br/limpeza/lavanderia/lava-roupas-em-po
- https://www.carone.com.br/limpeza/lavanderia/lava-roupas-em-po?page=1
- https://www.carone.com.br/limpeza/casa/limpador-perfumado
- https://www.carone.com.br/limpeza/casa/limpador-de-piso
- https://www.carone.com.br/mercearia/graos-e-cereais/arroz
- https://www.carone.com.br/mercearia/graos-e-cereais/feijao
- https://www.carone.com.br/matinais/cafes/cafe-torrado-e-moido
- https://www.carone.com.br/refrigerados/frios-e-laticinios/iogurtes
- https://www.carone.com.br/refrigerados/frios-e-laticinios/manteigas
- https://www.carone.com.br/refrigerados/frios-e-laticinios/requeijao
- https://www.carone.com.br/bebidas/sucos/sucos-integrais
- https://www.carone.com.br/bebidas/refrigerantes/refrigerantes
- https://www.carone.com.br/doces-e-sobremesas/chocolates/chocolates
- https://www.carone.com.br/doces-e-sobremesas/doces/doce-de-leite
- https://www.carone.com.br/mercearia/creme-de-leite-e-derivados/creme-de-leite
- https://www.carone.com.br/hortifruti/frutas/frutas
- https://www.carone.com.br/hortifruti/verduras/verduras-e-hortalicas
- https://www.carone.com.br/hortifruti/legumes/legumes
- https://www.carone.com.br/mercearia/biscoitos-e-snacks/biscoitos-doces
- https://www.carone.com.br/limp-perf-conc-coala-120ml-lima-limao/p
- https://fs.carone.com.br/limp-perf-secar-120ml-orquidea/p

As páginas individuais e fotos selecionadas constam no manifesto.
