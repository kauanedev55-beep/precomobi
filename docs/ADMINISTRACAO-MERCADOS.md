# Administração dos mercados

Em **Mercados**, uma conta administradora pode cadastrar unidades com nome,
endereço, bairro, cidade e UF. Coordenadas são opcionais e só devem ser inseridas
quando verificadas. Sem coordenadas, o link do Google Maps usa o endereço.

O servidor concede a permissão apenas às contas ativas com e-mail confirmado
incluído em `ADMIN_EMAILS` (lista separada por vírgulas no backend do Render).
O valor padrão é vazio. Não configure essa lista no frontend e não use
`user_metadata` do Supabase para conceder acesso administrativo.
Alterações na lista exigem deploy do backend. A conta pode atualizar a página
para recarregar seu perfil; o servidor verifica a permissão em cada cadastro.
Não há promoção de outras contas pela interface.

`POST /api/markets` exige administradora autenticada. Usuários comuns recebem
403, sessões ausentes recebem 401, dados inválidos recebem 422 e unidades
duplicadas recebem 409. O cadastro não altera mercados, preços ou listas antigos.
O formulário publica o mercado para consulta e contribuição de preços por todos.

## Unidades solicitadas em 30/10/2026

Uma migração de dados adiciona somente Sempretem Jacaraípe, Assaí Serra e
Assaí Vitória Aeroporto. Fontes: [Sempretem](https://superatacadosempretem.com.br/),
[Assaí Serra](https://www.assai.com.br/loja/assai-serra) e
[Assaí Vitória Aeroporto](https://www.assai.com.br/loja/assai-vitoria-aeroporto).
Não cria preços nem coordenadas. Não substitui registros existentes.

O marcador `requested-markets-2026-10-30`, na tabela privada
`app_data_migrations`, é gravado na mesma transação das inclusões e impede
repetição após reinícios. A migração não executa no modo de demonstração.
Nenhum dado em `auth.users` é alterado.
