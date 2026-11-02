# Ofertas, avisos e leitura mais simples

A área inicial destaca a lista em edição, as ofertas relacionadas às listas e
as ações de encontrar produto e compartilhar preço/oferta. O menu do celular
tem acesso direto a Início, Minha lista, Ofertas e Comunidade. Perfil, mercados,
contribuições e cadastro administrativo continuam disponíveis no menu completo.

## Fluxo de contribuição

Em **Vi um preço ou oferta**, a pessoa escolhe entre preço comum e oferta.
O leitor EAN/QR e a pesquisa por nome continuam disponíveis. Quando há várias
variantes na busca, a pessoa escolhe o produto antes de registrar o valor.
Ofertas exigem preço, mercado, validade futura e condições (livre ou descrição
de clube, quantidade ou outra exigência). Não há preço anterior ou percentual
de desconto estimado.

## Confirmações e encerramento

Outra conta pode confirmar, avisar o novo preço que viu ou sinalizar que a
oferta acabou. Cada conta tem um único parecer por oferta; mudar de opinião
atualiza esse parecer, sem aumentar artificialmente a contagem. O autor não
confirma a própria oferta. O autor ou uma administradora pode encerrá-la.

Avisos de terceiros ficam visíveis como alerta, sem reescrever o preço do autor
ou fingir uma confirmação coletiva. Validades encerradas saem da busca ativa,
mas permanecem em Minhas ofertas. Encerrar não exclui dados.

## Privacidade e total da compra

Avisos usam somente os produtos das listas salvas da conta autenticada e da
lista em edição daquele navegador. As listas não são publicadas nem os e-mails
dos participantes expostos nas ofertas. A contagem representa ofertas ativas
relacionadas, e não mensagens não lidas.

Ofertas ficam em tabelas próprias (`offers` e `offer_checks`) no mesmo schema
privado da aplicação. A atualização cria somente essas estruturas vazias e
preserva mercados, produtos, preços e listas. Não inclui ofertas de exemplo.
Uma oferta com condições não substitui automaticamente o preço comum usado na
comparação: a pessoa deve conferir se atende às condições antes de comprar.

Avisos são consultados no aplicativo ao abrir, retornar à aba e a cada minuto
com a página visível. Não há push, SMS ou e-mail de ofertas nesta versão.

## Interface

Fundo claro, verde escuro e acentos suaves; fonte principal de 16px, campos de
16px, ações principais de pelo menos 48px, foco de teclado visível e link de
pular para o conteúdo. Feedback usa texto além de cores. Movimento é removido
quando a pessoa prefere animações reduzidas. Não há promessa de economia nem
preços fictícios na apresentação das ofertas.

Validações: ciclo completo de ofertas, validade, permissões, parecer único,
isolamento entre duas contas, ausência de alteração dos preços comuns e criação
aditiva das tabelas; testes existentes de compras, leitor e mapas preservados.
O navegador remoto não alcança o servidor local deste ambiente; avaliação com
usuários e teste de câmera em celulares físicos continuam necessários.
