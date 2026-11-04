# Listas temporárias, busca e Cariacica

## Compra sem salvar

A lista em edição acompanha a navegação em memória. Não é gravada automaticamente
no navegador nem na conta. Recarregar ou fechar o aplicativo descarta o rascunho.
A atualização remove somente a antiga cópia automática da conta atual no
localStorage; as listas do banco permanecem intactas.

- Comparar sem salvar envia os itens a POST /api/comparisons/preview. O servidor
  valida os produtos e calcula a mesma comparação por cidade, sem inserir lista,
  itens, produtos ou preços. A resposta tem shopping_list_id nulo.
- Salvar lista é uma ação explícita. A lista fica na conta e o rascunho é limpo,
  pronto para outra compra. Pode ser comparada novamente em Minhas listas salvas.
- Na comparação temporária, Salvar lista guarda os itens; Concluir sem salvar limpa o rascunho e retorna à lista vazia.
- Listas já guardadas anteriormente continuam privadas e disponíveis; não são
  excluídas pela atualização.

Quantidades aceitam até três casas decimais, de acordo com a precisão do banco.
As mesmas quantidades geram os mesmos totais nas comparações temporária e salva.

## Pesquisa de produtos

A tela começa com uma orientação para buscar, sem carregar todo o catálogo.
Após enviar a busca ou escolher um atalho, mostra somente os resultados daquele
termo, identificado no cabeçalho. Limpar busca volta ao início vazio. Nome e
código de barras continuam disponíveis. Resultados sem observação local mostram
Preço ainda não informado.

A consulta externa pode ter importado a identificação do produto para o catálogo
compartilhado, necessária para identificá-lo em listas e contribuições. Isso não
cadastra preços nem garante estoque. Não apagamos esses registros: podem estar
referenciados em listas ou históricos. A correção evita expor todo esse catálogo
como se fosse a pesquisa atual.

## Fotografias

Os cartões agora são links: um clique abre a ação correspondente. Não há janela
intermediária com um segundo botão. As fontes e os créditos das fotografias ficam
em Sobre as fotografias no final da página.

## Cariacica

A cidade aparece no seletor. Importação aditiva cariacica-markets-2026-11-04,
executada uma vez em produção, sem preços nem coordenadas inferidas:

- Supermercados BH Itacibá: Alameda da Frincasa, 191, Itacibá.
  Fonte oficial: https://www.supermercadosbh.com.br/lojas/itaciba-es/
  Divulgação de inauguração: https://www.supermercadosbh.com.br/inauguracao/2026/04/supermercados-bh-inaugura-novas-lojas-em-minas-gerais-e-no-espirito-santo-e-amplia-presenca-nas-regioes/
- Extrabom Campo Grande: Av. Expedito Garcia, 947, Campo Grande.
  https://www.extrabom.com.br/lojas/101-campo-grande/folheto/
- Perim Campo Grande: Av. Mário Gurgel, 5221, BR-262, São Francisco.
  https://www.superperim.com.br/nossaslojas

Endereços conferidos nas fontes oficiais em 04/11/2026. Algumas páginas do BH
aparecem no índice público mas não abrem diretamente; o endereço também consta
na divulgação oficial da inauguração. Os cadastros existentes com o mesmo nome
ou endereço na cidade são mantidos, inclusive quando desativados ou editados.
Preços das novas unidades dependem de coleta real.
