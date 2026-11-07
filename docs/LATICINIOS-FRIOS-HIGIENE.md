# Ampliação de laticínios, frios e higiene pessoal

Referências: catálogos públicos do Carone e Extrabom, consultados em 06/11/2026. A migração acrescenta 544 apresentações: 203 de laticínios, 98 de frios e 243 de higiene. Não importa preços, disponibilidade ou ofertas. Preços continuam associados às lojas e cidades cadastradas.

Inclui queijos, iogurtes, petit suisse, leite fermentado, requeijões, presuntos, mortadelas, salames, peito de peru e bacon; cremes dentais, papel higiênico, hastes flexíveis, absorventes, fraldas infantis/adultas, lenços, shampoos e condicionadores. Nomes, marcas, fotos e páginas de origem ficam no manifesto `backend/app/db/daily_dairy_deli_hygiene.json`. Variações de sabor, tamanho, contagem e apresentação permanecem distintas.

## Código de barras

171 apresentações com embalagem fixa recebem o GTIN informado no catálogo Carone, após verificação de formato, dígito verificador e unicidade. Isso valida a estrutura do código e sua origem publicada; não equivale a uma certificação independente da GS1 nem à conferência física de cada embalagem. Os demais registros ficam sem EAN e continuam pesquisáveis pelo nome. Não foram inventados códigos nem preenchidos códigos nos 686 registros anteriores.

Códigos internos, alfanuméricos, inválidos, repetidos, restritos a circulação interna e uma referência de 14 dígitos potencialmente logística foram omitidos. Produtos por peso não recebem o código interno da etiqueta do supermercado. Uma divergência entre código publicado e foto também foi omitida. Uma apresentação duplicada de mussarela Porto Alegre 150g foi retirada após comparação das fotos.

O importador preserva o registro que já possuir o EAN, sem mover preços ou trocar marca, e a migração roda apenas uma vez. Produtos vendidos por quilo usam referência de 1 kg; gramaturas aproximadas de bandeja não viram embalagens fixas. Fraldas, absorventes, lenços e rolos usam a quantidade de unidades da embalagem. Promoções ambíguas e kits sem conteúdo inequívoco foram excluídos.

## Busca e validação

Busca reconhece pasta de dente/creme dental, cotonete/haste flexível, xampu/shampoo, papéis/papel e muçarela/mussarela. Frios tem categoria própria também no cadastro manual.

Todas as 544 URLs de imagem retornaram HTTP 200 com tipo de conteúdo de imagem durante a coleta. Seis referências sem imagem verificável foram excluídas. Fotos de queijo, presunto, papel, fralda e hastes foram inspecionadas por amostragem; fotos e conteúdo dos sites podem mudar e não houve inspeção visual de cada produto.

Testes cobrem preservação de registros/preços, repetição segura da migração, colisão de EAN existente, validação dos códigos, busca local por código sem consulta externa, categorias e unidades. A ampliação não cria serviço, assinatura nem rotina paga.
