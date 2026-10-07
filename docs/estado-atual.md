# PreçoMobi — Estado atual do projeto

> Este documento substitui, para fins de apresentação, os documentos antigos em
> `docs/` que ficaram desatualizados (alguns ainda citam PostgreSQL e comandos
> incorretos). Ele reflete o que existe **de verdade** no código nesta data.
> Sempre que algo aqui for alterado, atualize também esta seção.

Última atualização: gerado automaticamente durante o desenvolvimento assistido,
antes da defesa/apresentação — **revise a data ao entregar**.

## 1. O que é

PreçoMobi é um app de comparação de preços de supermercado, com o objetivo de
evoluir para um modelo colaborativo (a comunidade informa preços, como o
Waze faz com o trânsito). Cidade-piloto: Serra/ES.

## 2. Arquitetura

```
React + TypeScript + Vite  (frontend, :5173)
        │  fetch (REST/JSON)
        ▼
FastAPI  (backend, :8000, docs em /docs)
        │  SQLAlchemy (ORM)
        ▼
SQLite  (arquivo único, data/precomobi.db)
```

O frontend nunca acessa o banco diretamente — só conversa com a API.

## 3. Tecnologias e por que foram escolhidas

| Camada | Tecnologia | Por quê / custo |
|---|---|---|
| Frontend | React + TypeScript + Vite | Padrão de mercado, tipagem reduz bugs, Vite é rápido em dev. Gratuito. |
| Roteamento | react-router-dom | Navegação entre 14 telas sem recarregar a página. Gratuito. |
| Backend | FastAPI (Python) | Rápido de escrever, gera documentação Swagger sozinho, tipado com Pydantic. Gratuito. |
| Banco | SQLite | Zero configuração, um arquivo só, ótimo para MVP acadêmico. Gratuito, sem servidor de banco separado. |
| ORM | SQLAlchemy | Abstrai o SQL, facilita trocar de banco no futuro se necessário. Gratuito. |
| Senha | bcrypt | Padrão para hash de senha (nunca texto puro). Gratuito, roda local. |
| Sessão | Token assinado com HMAC (biblioteca padrão do Python) | Evita depender de uma lib de JWT só para isso. Gratuito, sem serviço externo. |
| Mapa | Leaflet + OpenStreetMap | Sem chave de API, sem cartão. Tem política de uso justo (não pode gerar volume industrial de requisições) — adequada para um projeto acadêmico. |
| Leitura de código de barras | ZXing (`@zxing/browser`) | Roda 100% no navegador, usando a câmera do aparelho. Nenhum vídeo é enviado a servidor algum. Gratuito, código aberto. |
| E-mail de boas-vindas | SMTP (biblioteca padrão do Python) | Não usa serviço pago; funciona com um Gmail comum (Senha de App) ou qualquer provedor SMTP gratuito. Se não configurado, é pulado sem quebrar o cadastro. |
| Hospedagem | Render (backend + frontend) + GitHub (código) | Gratuito, sem cartão. Backend "dorme" após 15 min sem uso (ver `docs/publicacao.md`). |

Nada nessa lista exige cartão de crédito ou tem custo obrigatório.

## 4. Telas (frontend)

| Tela | Rota | Precisa login? | Status |
|---|---|---|---|
| Home | `/` | Não | Implementada |
| Login | `/login` | — | Implementada |
| Cadastro | `/cadastro` | — | Implementada |
| Produtos / busca (nome ou EAN, câmera) | `/produtos` | Não | Implementada |
| Detalhe do produto | `/produtos/:id` | Não | Implementada |
| Lista de compras | `/lista` | Parcial* | Implementada |
| Comparação | `/comparacao/:id` | Sim | Implementada |
| Contribuir com preço | `/contribuir` | Sim | Implementada |
| Minhas contribuições | `/minhas-contribuicoes` | Sim | Implementada |
| Histórico de preços | `/historico` | Não | Implementada |
| Mercados | `/mercados` | Não | Implementada |
| Mapa | `/mapa` | Não | Implementada (ver limitação abaixo) |
| Perfil | `/perfil` | Sim | Implementada |
| 404 | qualquer rota inválida | — | Implementada |

\* A lista pode ser montada sem login; para salvá-la e compará-la, pede login.

## 5. Endpoints da API (`/api/...`)

| Método | Rota | Para quê |
|---|---|---|
| POST | `/auth/register` | Cadastro (dispara e-mail de boas-vindas, se configurado) |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Dados do usuário logado |
| GET | `/products?q=&ean=` | Busca por nome/marca/categoria ou por EAN |
| GET | `/products/{id}` | Detalhe do produto + preço por mercado |
| GET | `/markets` | Lista de mercados |
| POST / GET / GET{id} / DELETE | `/shopping-lists` | Listas de compras (só do próprio usuário) |
| GET | `/comparisons/{id}` | Compara uma lista entre os mercados (só do dono) |
| POST | `/price-reports` | Contribuir com um preço (login obrigatório) |
| GET | `/price-reports/mine` | Minhas contribuições |
| GET | `/price-reports?product_id=&market_id=` | Histórico público de preços |
| GET | `/health`, `/health/database` | Verificação de saúde da API/banco |

## 6. Banco de dados

Tabelas: `users`, `products`, `markets`, `price_reports`, `price_confirmations`
(criada, ainda sem uso — ver seção 8), `shopping_lists`, `shopping_list_items`.

- `price_reports.source_type` diferencia `development` (dado de teste) de
  `community` (informado por um usuário). O histórico nunca é apagado: uma
  nova contribuição cria uma linha nova.
- Mercados atuais: **Carone Laranjeiras**, **Extrabom Colina de Laranjeiras** e
  **Supermercados BH Laranjeiras**, todos em Serra/ES (nomes e endereços
  reais). Latitude/longitude ainda não preenchidas — ver seção 8.

## 7. Testes

40 testes automatizados (pytest), cobrindo: saúde da API, catálogo/EAN/busca,
listas de compras (criação, dono, exclusão), comparação (mercado completo,
parcial, dono, preço mais recente), autenticação (cadastro, login, e-mail
duplicado, token), contribuição de preços (histórico preservado, validações,
"minhas contribuições") e o e-mail de boas-vindas (não quebra o cadastro
quando não configurado). Os testes usam um banco SQLite temporário — nunca
tocam em `data/precomobi.db`.

Rodar: `python -m pytest tests -v` (na raiz do projeto, com o ambiente do
backend ativado).

## 8. O que falta (PLANEJADO, não implementado)

- **Coordenadas dos mercados:** os nomes e endereços já são reais, mas
  faltam latitude/longitude confirmadas (não foram inventadas, de propósito
  — ver `MARKET_COORDINATES` em `backend/app/db/init_db.py`). Sem isso, o
  mapa mostra a lista de mercados mas nenhum marcador.
- **Confirmação de preços** (usuário B confirmando um preço que A informou):
  a tabela `price_confirmations` já existe no banco, mas não há endpoint
  nem tela ainda.
- **Confirmação de e-mail no cadastro** (link de verificação): hoje só existe
  o e-mail de boas-vindas informativo, não um fluxo de confirmação de conta.
- **Mais mercados / expansão de cobertura:** ver seção 9.
- **Publicação em produção:** o projeto já está pronto tecnicamente (CORS
  configurável, build de produção testado, SQLite cria a própria pasta
  sozinho). O guia passo a passo está em `docs/publicacao.md` (Render,
  gratuito, sem cartão) — falta só executar os passos (criar as contas e
  conectar o repositório).
- **Rota até o mercado**: hoje abre o OpenStreetMap em outra aba; uma
  navegação passo a passo dentro do app não foi implementada (nem é o foco).

## 9. Se formos crescer o número de mercados: opções de fonte de dados

Hoje os mercados são cadastrados manualmente (3, de propósito, para o MVP).
Se o projeto crescer, as alternativas de fonte de dados são:

| Fonte | Custo | Observação |
|---|---|---|
| **Cadastro manual/colaborativo** (a própria comunidade sugere um mercado novo) | Gratuito | Combina com a proposta do PreçoMobi (base própria e colaborativa). Exige moderação simples para evitar spam. |
| **Overpass API (dados do OpenStreetMap)** | Gratuito, sem chave, com uso justo | Permite buscar automaticamente "todos os supermercados num raio de X km" a partir de dados que a comunidade do OpenStreetMap já mapeou. Cobertura varia por região (pode faltar loja pequena). |
| **Google Places API** | Tem cota gratuita mensal, mas exige cartão de crédito cadastrado e passa a cobrar acima da cota | Cobertura mais completa, mas foge da regra de "sem serviço pago" do projeto — não recomendado para o MVP acadêmico. |
| **Dados abertos da Receita Federal (CNPJ por CNAE de supermercado)** | Gratuito | Mostra empresas registradas como supermercado, mas não filtra endereço exato de cada loja física nem valida se ainda está aberta. |

Recomendação para o TCC/apresentação: manter o cadastro manual agora, e citar
a Overpass API como a evolução natural e gratuita, coerente com o mapa (que já
usa OpenStreetMap).

## 10. Segurança (o que já existe)

- Senhas com hash bcrypt, nunca texto puro.
- Token de sessão assinado (HMAC), com validade de 7 dias.
- Cada usuário só vê/edita as próprias listas e contribuições (testado).
- Nenhuma chave/senha fica no código do frontend.
