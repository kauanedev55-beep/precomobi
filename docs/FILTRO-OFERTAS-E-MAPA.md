# Filtro por cidade, mercado e unidade

- Promoções obtém as opções do cadastro de lojas, não dos nomes das fontes ou somente das ofertas presentes na tela.
- Cidade define quais redes e lojas podem ser escolhidas. Mercado restringe à rede e Loja restringe à unidade.
- O servidor aplica os IDs de lojas junto com a cidade antes de agrupar ou limitar resultados. O cliente também restringe os membros de cada grupo à seleção.
- Mercados sem promoções vigentes continuam no filtro e exibem um estado vazio explícito.
- O mapa geral mostra a cidade. Escolher uma loja mostra apenas essa unidade, inclusive no mapa e na lista abaixo. Links de comparação com mercado=ID abrem uma única unidade.
- Ao mudar de cidade, uma seleção anterior de loja é limpa. Uma rota recebida por link para outra cidade mantém apenas a unidade do link e informa a diferença.

## Dados adicionais revisados

Foram conferidas 10 apresentações do Extrabom e 5 do BH. Não foram criadas lojas nem estimados preços.

Extrabom: folheto 12–18/11/2026 vinculado às páginas oficiais de Colina de Laranjeiras e Laranjeiras. O rodapé exclui Feu Rosa, Serra Centro, Serra Dourada, Express Centro e Areia Preta. Os valores não foram aplicados nessas unidades. O primeiro folheto servido pela página Serra Centro era Express e não foi usado para essa cidade.

Fonte: https://www.extrabom.com.br/lojas/66-colina-de-laranjeiras/folheto/

BH: consulta pública oficial POST https://superbh.app/site-api/api/mov-folheto/vigente, município SERRA@ES. Edição Espírito Santo I Segunda Quinzena - Novembro, validade até 30/11/2026 e abrangência lojas ES. A data inicial do registro é a conferência, porque o documento não especifica o início.

O arquivo backend/app/db/official_flyers_market_refresh.json registra produtos, unidade, preços de clube e comuns, validade, fonte e evidência. A importação é versionada e repetível sem duplicações. Preços vencidos não foram prorrogados.
