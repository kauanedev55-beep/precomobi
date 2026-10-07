# Arquitetura inicial do PreçoMobi

## Objetivo

A primeira versão será uma aplicação web responsiva com uma única interface para computadores e celulares. Não serão criadas aplicações nativas separadas para Android e iOS.

## Fluxo principal

```text
Usuário
   ↓
React + TypeScript
   ↓ HTTP/JSON
FastAPI
   ↓ SQL
PostgreSQL
```

## Responsabilidades

### Front-end

O front-end exibirá telas, formulários, listas, mensagens de validação e resultados da comparação. Ele não será responsável por decidir quais preços são válidos nem por executar sozinho o cálculo principal.

### Back-end

O back-end validará os dados, protegerá as rotas, aplicará as regras de negócio, calculará as comparações e registrará as contribuições.

### Banco de dados

O PostgreSQL armazenará usuários, produtos, mercados, registros históricos de preços, listas e itens de listas.

## Regra inicial de comparação

Para cada produto da lista, o sistema utilizará o preço mais recente disponível para cada mercado. O preço será multiplicado pela quantidade solicitada e os itens serão somados.

Um mercado só será apresentado como compra completa quando possuir preço para todos os produtos da lista. Mercados com itens faltantes poderão aparecer como cobertura parcial, mas não serão classificados como vencedores da compra completa.

## Decisões de simplicidade

- O estado global do front-end não utilizará Redux inicialmente.
- A comunicação inicial poderá usar `fetch` nativo.
- Não haverá mapa, código de barras ou integração externa no primeiro incremento.
- Não haverá sistema de reputação no primeiro incremento.
- Não será usado Docker inicialmente, para reduzir a quantidade de ferramentas necessárias.
- Nenhuma integração com supermercados será presumida.

## Segurança mínima

- Senhas serão armazenadas somente como hashes.
- Rotas privadas exigirão autenticação.
- Um usuário somente poderá acessar suas próprias listas.
- O back-end validará os dados recebidos.
- Segredos ficarão em variáveis de ambiente e não serão versionados.

## Fases

1. Verificação do ambiente.
2. Estrutura executável do front-end e back-end.
3. Banco de dados e autenticação.
4. Produtos, mercados e preços.
5. Listas de compras.
6. Comparação.
7. Histórico e contribuição.
8. Funcionalidades posteriores.
