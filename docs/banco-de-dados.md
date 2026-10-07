# Banco de dados relacional do PreçoMobi

## Objetivo

O banco precisa responder a três perguntas principais:

1. Qual produto foi observado?
2. Em qual mercado e por qual usuário?
3. Qual era o preço no momento da observação?

Por isso, um preço não será sobrescrito. Cada observação será um registro histórico independente na tabela `price_reports`.

## Modelo principal

```text
users 1 ─── N price_reports N ─── 1 products
                     │
                     N
                     │
                     1
                  markets

users 1 ─── N shopping_lists 1 ─── N shopping_list_items N ─── 1 products

price_reports 1 ─── N price_confirmations N ─── 1 users
```

## Entidades do MVP

### `users`

Armazena a conta responsável por listas e contribuições. O e-mail possui unicidade e a senha será armazenada apenas como `password_hash`.

### `products`

Representa o produto físico. O campo `ean` é opcional no primeiro incremento, mas possui índice e unicidade quando preenchido. O EAN identifica o produto; ele não contém o preço.

### `markets`

Representa um estabelecimento. A primeira base poderá conter poucos mercados da Serra/ES. Latitude e longitude podem ser preenchidas depois para distância e mapa.

### `price_reports`

É a tabela mais importante para o histórico colaborativo. Cada linha representa uma observação:

| Campo | Função |
|---|---|
| `product_id` | Produto observado |
| `market_id` | Mercado onde o produto foi observado |
| `user_id` | Usuário que informou, podendo ser nulo para carga inicial controlada |
| `price` | Preço observado, em `NUMERIC(10,2)` |
| `reported_at` | Data e hora da observação |
| `source_type` | `development`, `admin_seed` ou `user_contribution` |
| `notes` | Observação opcional |

O preço mais recente pode ser consultado ordenando por `reported_at DESC` para cada combinação de produto e mercado. Os registros antigos continuam disponíveis para histórico e análise.

### `price_confirmations`

A tabela já deixa espaço para a evolução colaborativa. Ela relaciona outro usuário a um registro de preço e permite estados como `confirmed` ou `disputed`. A restrição única impede que o mesmo usuário confirme várias vezes o mesmo registro.

A interface de confirmação ficará para uma fase posterior, mas a estrutura não precisará ser refeita.

### `shopping_lists` e `shopping_list_items`

A lista guarda produtos e quantidades, mas não congela preços. Quando o usuário compara, o sistema consulta os registros de preço mais recentes disponíveis para cada mercado.

## Regras de integridade

- O preço será decimal, nunca ponto flutuante.
- Uma nova observação cria uma nova linha.
- Uma lista pertence a um usuário.
- Um usuário não acessa listas de outro usuário.
- Produto e mercado são identificados por chaves estrangeiras.
- Um preço sem usuário é permitido apenas para dados iniciais controlados.
- Dados de desenvolvimento devem ser identificados por `source_type`.
- Uma compra completa exige preço para todos os produtos da lista.
- Um mercado com itens ausentes será apresentado como cobertura parcial.
- O EAN identifica o produto e não substitui o registro de preço.

## Índices

Os índices iniciais estão concentrados nas consultas reais do MVP:

- `users.email`;
- `products.ean`;
- `price_reports.product_id`;
- `price_reports.market_id`;
- `price_reports.user_id`;
- `price_reports.reported_at`;
- combinação de produto, mercado e data em `price_reports`;
- `shopping_lists.user_id`;
- `shopping_list_items.shopping_list_id`.

## Consulta conceitual do preço mais recente

Para cada produto e mercado, a aplicação deverá selecionar o registro mais recente. Essa regra será implementada no serviço de comparação, e não no front-end.

```text
lista de produtos
    ↓
preços ativos por produto e mercado
    ↓
registro mais recente de cada combinação
    ↓
preço unitário × quantidade
    ↓
total por mercado
```

## Evolução futura

A reputação não deve ser armazenada como um valor fixo editável. Quando for implementada, deverá ser calculada a partir de eventos verificáveis, como contribuições, confirmações e divergências. Isso preserva a diferença entre participação e confiabilidade.
