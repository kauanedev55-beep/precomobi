# Responsividade e diversidade das ofertas

## Celulares

A camada `frontend/src/styles/responsive.css` é carregada depois dos estilos existentes. Usa o espaço disponível, com ajustes em 1024, 820, 480 e 359 px e em orientação horizontal com pouca altura. Não limita o zoom do navegador e remove o mínimo global de 320 px que causava rolagem horizontal em telas menores.

Até 820 px, a navegação fica no rodapé, a cesta abre por baixo e os controles de peso e quantidade se reorganizam dentro dos resultados. Botões de ações e campos têm áreas de toque de 44–48 px. Campos usam 16 px para evitar ampliação automática ao focar no iOS. Fotos mantêm proporções e nomes longos quebram linha. Tabelas extensas continuam com rolagem própria.

O cabeçalho e o menu inferior têm suas alturas medidas por ResizeObserver; esses valores posicionam menu e cesta. Áreas seguras são respeitadas por viewport-fit=cover e safe-area-inset. VisualViewport ajusta a altura disponível e detecta o teclado ao editar campos: a barra da cesta e a navegação inferior se recolhem enquanto o teclado disputa espaço. O nome da lista permanece visível enquanto está sendo editado. Há fallback para navegadores sem ResizeObserver ou VisualViewport.

## Ofertas da cidade

O limite antigo de 100 registros por loja podia esconder redes inteiras. A consulta `grouped=true` aplica primeiro os filtros de região, validade e interesse, agrupa ofertas oficiais idênticas e só então limita a 100 cartões. Alterna as redes na apresentação, mantendo a recência dentro de cada rede. Consultas antigas e Minhas promoções mantêm o comportamento individual.

Somente ofertas com o mesmo folheto, identificação da fonte, produto, preço, condições, validade e estado são agrupadas. Contribuições da comunidade permanecem individuais. A lista de lojas de cada grupo respeita o filtro original da consulta. Rota, confirmações e avisos continuam ligados à loja selecionada; avisos em outra loja são sinalizados sem somar confirmações de estabelecimentos diferentes.

Há um filtro por mercado ou rede. Não foram criados preços nesta alteração, nem presumida igualdade de preço entre todas as lojas da rede.

## Verificação

- Backend: 167 testes passaram, incluindo o cenário com mais de 100 registros repetidos que antes escondia o Carone, isolamento de cidades e confirmações por loja.
- Frontend: 20 testes passaram; TypeScript e build de produção concluídos.
- Ensaio com os dados dos folhetos de Serra: 118 registros por loja resultam em 23 cartões (12 Extrabom, 10 Carone e 1 Sempretem). Quantidades diminuem normalmente quando uma oferta vence.
- Revisão dos estilos e dos fluxos de busca, quantidade, cesta, formulários, listas, ofertas, scanner e mapas. A página pública foi aberta no navegador. O navegador disponível não expõe emulação de tamanhos de tela, e as telas privadas exigem sessão: não houve teste visual dessas telas em múltiplas resoluções nem teste físico de teclado, gestos ou rotação em aparelhos Android/iPhone. Essa validação continua necessária; não se afirma compatibilidade testada em todos os modelos.

Sem nova infraestrutura, serviço pago ou alteração de estrutura de dados.
