# Listas da família, recuperação e folhetos revisados

## Lista compartilhada

Salve uma lista, abra pelo nome em Minhas listas e toque em Convidar família. O responsável pode copiar um link ou abrir o WhatsApp para enviá-lo por conta própria. O app não envia mensagens automaticamente. O convite dura sete dias e exige entrar na própria conta e aceitar a participação. Qualquer pessoa com o link válido e uma conta pode aceitar; não existe aprovação posterior do responsável. Compartilhe apenas com as pessoas desejadas.

Os participantes veem nome, produtos, quantidades e marcações. Podem renomear a lista, incluir e remover produtos, ajustar quantidades e marcar Já peguei. As mudanças são consultadas a cada cinco segundos enquanto a página estiver visível, sem interromper a digitação. Cada gravação informa a revisão da lista; uma revisão desatualizada é recusada e a interface carrega os dados atuais, evitando sobrescrever o trabalho de outra pessoa.

Há três situações: Em preparação, Em compras e Concluída. A conclusão com pendências exige escolha explícita; os produtos pendentes continuam no histórico. Uma lista concluída precisa ser reaberta para editar. Editar como nova copia os produtos para um novo rascunho, desmarcados, preservando a compra anterior. Comparar continua opcional e está disponível aos participantes.

Somente o responsável cria ou encerra convites, remove participantes e exclui a lista. Remover um participante também invalida os links antigos, evitando que ele volte pelo mesmo convite. Os tokens são aleatórios e apenas seus hashes ficam no banco. A listagem e a comparação respeitam a participação; listas pessoais não passam a ser públicas.

## Recuperação

O rascunho é guardado neste navegador, separado por conta. Ao reabrir ou recarregar, aparece Sua lista está aqui, com nome e número de produtos. Continuar minha lista recupera quantidades e marcações. Criar outra lista arquiva a anterior em Rascunhos anteriores neste aparelho. O nome da lista é compartilhado entre a cesta e a página principal. Salvar na conta continua necessário para acesso em outro aparelho. Valores de preço em cache não são reutilizados após a recuperação.

Armazenamento local indisponível ou cheio gera um aviso para salvar na conta. Esta recuperação não depende de serviço pago. Limpar os dados do navegador pode apagar rascunhos locais; listas salvas na conta continuam no banco.

## Produtos e preços

Foram acrescentados 213 produtos: 145 do catálogo público Carone e 68 do Extrabom, com imagens reais, marca, conteúdo e URL de referência. As 213 URLs de imagem foram verificadas por HTTP; não houve inspeção visual de cada embalagem. Há 112 códigos de barras novos, originados do Carone, com formato e dígito verificador conferidos e sem repetir códigos existentes. A origem publicada não equivale a uma certificação independente da GS1.

Foram transcritas e revisadas 23 apresentações de produtos em três folhetos oficiais. Na base de 59 mercados, os escopos confirmados correspondem a 381 combinações produto/loja: 381 ofertas e 381 registros do preço normal sem clube. Isso não representa 381 produtos diferentes. A importação conserva os registros anteriores e pode rodar novamente sem duplicação.

| Rede | Fonte e validade confirmadas | Tratamento |
| --- | --- | --- |
| Carone | [Encarte ES 02/11–14/11/2026](https://www.flipsnack.com/carone/encarte-quinzenal-esp-rito-santo-02-11-a-14-11), divulgado no [perfil oficial](https://linktr.ee/caroneonline) | Dez apresentações, nas dez lojas Carone ES cadastradas. Valor de clube separado do valor expresso como Oferta loja. |
| Extrabom | [Folheto da loja Colina de Laranjeiras](https://www.extrabom.com.br/lojas/66-colina-de-laranjeiras/folheto/), páginas com validade 05/11–11/11/2026 e abrangência Todas as lojas | Doze apresentações, em 23 lojas ES cadastradas. Feu Rosa, Serra Centro e Serra Dourada foram excluídas conservadoramente devido às exceções indicadas no rodapé. |
| Sempretem | [Encarte ES 26/10–07/11/2026](https://www.flipsnack.com/sempretem/encarte-quinzenal-esp-rito-santo-26-10-a-07-11), vinculado no [site oficial](https://superatacadosempretem.com.br/) | Biscoito Vitarella Delicitá Cristal 414g, R$ 5,49, nas cinco lojas ES cadastradas. Vence em 07/11 às 23h59 de Brasília. Se a publicação ocorrer depois disso, é ignorado pela importação. |
| BH | [Folhetos oficiais com seleção de cidade](https://www.supermercadosbh.com.br/folhetos) | A seleção dinâmica não retornou uma oferta verificável nesta consulta. PDFs antigos encontrados na busca não foram tratados como atuais. |
| Perim | [Site oficial](https://www.superperim.com.br/) remete ao perfil social para novidades | Não foi confirmado um folheto atual com produto, preço, loja/abrangência e validade completos nesta revisão. Nenhum preço foi presumido. |

As imagens originais do Extrabom estão em `uploads/ofertas/20261104175725_thumb_campanha_7693_pagina_1.png` e `uploads/ofertas/20261104175741_thumb_campanha_7693_pagina_2.png` no domínio oficial. A segunda página contém a validade e o rodapé da edição. A capa do Carone informa explicitamente todas as lojas do ES e as datas de 2026. O manifesto `official_flyers_20261107.json` mantém produto exato, fonte, abrangência, condições e os dois valores separados.

Preços exclusivos de clube ficam em Promoções, com exigência e preço sem clube visíveis. Apenas o preço normal escrito no encarte participa da comparação. A data de início da vigência é usada na observação oficial, preservando a prioridade de uma contribuição comunitária mais recente. O preço é retirado de pesquisa, detalhe e comparação ao expirar; não exige tarefa agendada. As condições de estoque continuam valendo. Não é atualização automática diária: esta carga foi revisada manualmente.

## Validação

Testes cobrem aceitação explícita, expiração e revogação de convite, privacidade entre contas, acesso à comparação, perda de acesso após remoção, conflitos de revisão, conclusão com pendências, recuperação de rascunhos e descarte de preços em cache. Também cobrem preços de clube separados, escopo por loja/estado, expiração automática e preservação de observações anteriores.

Uma cópia local dos 1.230 produtos e 59 mercados foi usada para simular a carga duas vezes: resultou em 1.443 produtos, 59 mercados e 381 pares de preços/ofertas, sem alteração dos produtos anteriores. O navegador conectado não estava disponível para conferir gestos em aparelho físico. Nenhum serviço pago, envio automático de WhatsApp ou monitor contínuo de ofertas foi criado.
