# Atualização de preços e demonstração — 17/11/2026

## O que foi implementado
- Consulta assistida de fontes oficiais por um programa Python local. Não usa API de IA nem serviço pago.
- Executar ATUALIZAR-PRECOS.cmd abre um relatório com folhetos encontrados, mudanças e falhas.
- O programa consulta o cadastro público de lojas do próprio app; não cria lojas ou supõe outras cidades.
- Inicialmente suporta descoberta dos encartes Carone ES e Sempretem ES e tentativa de consulta à página da unidade Extrabom Serra Centro e do BH. A execução de 16/11 encontrou Carone e Sempretem; Extrabom e BH falharam nessa execução.
- O coletor descobre os documentos. Não lê com garantia os preços de todas as imagens e não publica automaticamente.
- A administradora pode usar Meu perfil → Atualizar preços para carregar um JSON, conferir as lojas/produtos/validade e publicar.
- A API verifica acesso master, IDs ativos, rede, região ES, unidade, preços e datas. Arquivos inválidos não são publicados parcialmente.
- Preço sem clube entra na comparação. Clube fica na promoção. Uma oferta apenas de clube não cria um preço comum.
- Repetir o mesmo arquivo não duplica as mesmas cotações e ofertas.
- Nenhuma alteração de tabelas, credenciais ou serviço pago foi necessária.

## Como usar uma vez por dia no Windows
1. Baixe o código atualizado pelo GitHub (Code → Download ZIP), extraia e mantenha a pasta.
2. É necessário Python 3 instalado. O coletor usa somente a biblioteca padrão.
3. Abra ATUALIZAR-PRECOS.cmd. A consulta precisa de internet e o relatório abre no navegador.
4. Quando houver novo folheto, confira preço, apresentação, unidade, período, clube e abrangência no documento.
5. Um arquivo revisado pode seguir o modelo real backend/app/db/official_flyers_20261116.json. Altere somente com evidência do novo folheto; não prorrogue datas antigas.
6. Entre com sua conta master no app, abra Meu perfil → Atualizar preços e carregue esse arquivo JSON revisado. A própria ferramenta resolve os IDs pelo cadastro atual. Toque em Conferir arquivo, revise a lista de lojas e publique.
7. Opcionalmente, o programa python tools/preparar_importacao.py backend/app/db/official_flyers_20261116.json prepara atualizacoes/importar-precos.json pelo catálogo público, sem publicar. A tela aceita os dois formatos.
8. Sem Python no computador, o responsável pelo repositório também pode executar a ação Consultar fontes de folhetos no GitHub e baixar o relatório. Não há agendamento instalado; a execução é manual.

O computador precisa estar ligado e conectado na hora da consulta. Uma fonte indisponível fica como falha e não vira atualização bem-sucedida. Há fontes ainda sem adaptador; não há cobertura automática de todos os mercados ou de todos os produtos.

## Preços reais revisados em 16/11
Capa do encarte oficial Carone ES 16–28/11:
https://www.flipsnack.com/carone/encarte-quinzenal-esp-rito-santo-16-11-a-28-11

A capa declara abrangência de todas as lojas do ES e término em 28/11/2026, enquanto durarem os estoques.

| Produto cadastrado | Loja, sem clube | Clube Carone |
|---|---:|---:|
| Café Melitta Extra Forte Vácuo 250 g | 13,59 | 11,98 |
| Chocobiscuit Bauducco ao leite 80 g | 7,99 | 6,99 |
| Lasanha Seara Bolonhesa 600 g | 16,99 | 13,98 |
| Presunto Seara cozido fatiado, por kg | 32,79 | 27,98 |

Também foi revisado o carré suíno serrado e congelado por kg: Carone sem clube 15,99 e com clube 14,79 (até 28/11); Sempretem 14,69, sem exigência de clube (até 21/11). As duas capas identificam o mesmo tipo de corte congelado, sem marca declarada. A referência antiga de catálogo usava CARONE como marca de loja; apenas esse corte genérico passa a ficar sem marca, para não aparentar fabricação exclusiva.\n\nSão cinco produtos distintos: cinco apresentações em dez lojas Carone ES e o corte em cinco lojas Sempretem ES. Total: 55 pares produto/loja, não 55 produtos diferentes. A importação preserva históricos e não copia esses preços para outras redes. O folheto Sempretem 09–21/11 continua com os preços já revisados; folhetos anteriores de Carone, BH e Extrabom não foram prorrogados.

## O que dizer à banca
“O PreçoMobi combina contribuições da comunidade com folhetos oficiais revisados. Implementamos uma coleta assistida: ela consulta as fontes e sinaliza mudanças; a administradora confere os preços e a abrangência antes da publicação. Cada preço fica vinculado ao produto, à loja, à fonte e à validade. Preços de clube são separados dos preços comuns.”

Não apresentar como IA autônoma ou atualização integral diária. Não alegar que um mercado é o mais barato para a compra completa quando faltam cotações.

## Roteiro de demonstração
- Entrar na conta e escolher uma cidade cadastrada.
- Pesquisar carré suíno e adicionar 1 kg do corte serrado e congelado. Isso permite demonstrar preços reais diferentes entre Carone e Sempretem enquanto as duas edições estiverem vigentes. Café Melitta 250 g também possui nova cotação Carone, mas não se deve presumir cotação em todas as redes.
- Abrir Promoções e mostrar preço de clube, validade e fonte no ⓘ.
- Abrir a cesta, conferir a quantidade e comparar.
- Explicar a cobertura e mostrar a rota da unidade, sem prometer total completo onde há preços ausentes.
- Na conta master: abrir Atualizar preços e mostrar a prévia de um arquivo revisado.
- Executar o coletor no notebook e mostrar mudanças/falhas reais. Se não houver mudança, apresentar o status sem mudança.
- Evitar cadastrar preços fictícios no ambiente público. Dados simulados só em demonstração identificada e separada.
