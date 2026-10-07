# Guia completo: testar o PreçoMobi do zero no VS Code

## 1. O que você precisa instalar

Para testar a versão atual do PreçoMobi em um computador Windows, você precisa de quatro componentes gratuitos:

| Ferramenta | Para que serve | Custo |
|---|---|---|
| Visual Studio Code | Editar e abrir o projeto | Gratuito |
| Python 3.11 ou superior | Executar a API FastAPI | Gratuito e open source |
| Node.js 20 ou superior | Executar e compilar o front-end React | Gratuito e open source |
| Git, opcional | Controlar versões do projeto | Gratuito e open source |

Você não precisa instalar PostgreSQL para fazer o primeiro teste.

## 2. O banco de dados já está incluído no primeiro teste

A versão inicial usa SQLite. SQLite não é um programa separado nem um servidor que precisa ficar rodando. Ele é um arquivo criado automaticamente pela própria aplicação.

Quando a API for iniciada, será criado:

```text
data/precomobi.db
```

Esse arquivo contém as tabelas e os dados de teste. Portanto, nesta primeira fase:

```text
API FastAPI + SQLite local
```

não exige instalação, senha ou configuração de servidor de banco.

Mais adiante, o projeto poderá usar PostgreSQL. Nesse caso, o PostgreSQL será instalado separadamente ou hospedado em um serviço externo. A aplicação já está preparada para receber outra `DATABASE_URL`.

## 3. Abrir o projeto

1. Baixe ou copie a pasta `precomobi` para o computador.
2. Abra o Visual Studio Code.
3. Escolha **File > Open Folder**.
4. Selecione a pasta `precomobi`.
5. Abra o terminal integrado pelo menu **Terminal > New Terminal**.

A estrutura principal deve ser parecida com:

```text
precomobi/
├── backend/
├── frontend/
├── docs/
└── README.md
```

## 4. Conferir as instalações

No terminal do VS Code, execute:

```powershell
python --version
node --version
npm --version
```

Os comandos precisam retornar versões. O recomendado é Python 3.11 ou superior e Node.js 20 ou superior.

Se o comando `python` não funcionar no Windows, tente:

```powershell
py --version
```

Nesse caso, use `py` no lugar de `python` nos comandos seguintes.

## 5. Preparar e iniciar o back-end

Abra um primeiro terminal no VS Code e execute:

```powershell
cd .
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Se o PowerShell bloquear a ativação do ambiente virtual, execute uma vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Depois feche e abra o terminal do VS Code novamente e repita os comandos.

Quando funcionar, o terminal deverá mostrar algo semelhante a:

```text
Uvicorn running on http://127.0.0.1:8000
```

Não feche esse terminal. Ele precisa continuar aberto enquanto você testa o sistema.

## 6. O que acontece na primeira inicialização da API

Ao iniciar, a API:

1. cria o arquivo `./precomobi.db`;
2. cria as tabelas relacionais;
3. cria um usuário de demonstração interno;
4. cadastra cinco produtos;
5. cadastra três mercados;
6. cadastra preços de desenvolvimento;
7. fica aguardando requisições do front-end.

Você pode confirmar que a API está ativa acessando no navegador:

```text
http://localhost:8000
```

A documentação interativa da API fica em:

```text
http://localhost:8000/docs
```

Teste também:

```text
http://localhost:8000/api/health
```

O resultado esperado é uma resposta JSON indicando que a API está funcionando.

## 7. Preparar e iniciar o front-end

Abra um segundo terminal no VS Code. Não encerre o terminal do back-end.

Execute:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Quando funcionar, o terminal mostrará um endereço parecido com:

```text
Local: http://localhost:5173/
```

Abra esse endereço no navegador.

## 8. O que testar visualmente

Na página do PreçoMobi, siga este roteiro:

### Teste 1 — Identidade visual

Confirme se a página apresenta:

- marca PreçoMobi;
- paleta verde e fundo claro;
- seção inicial com chamada para economia;
- prévia de uma lista de compras;
- seção de funcionalidades;
- área de teste do MVP.

### Teste 2 — Conexão com a API

Na parte inferior da página, clique em:

```text
Testar conexão da API
```

O status deve mudar para algo semelhante a:

```text
Conectada: precomobi-api
```

Se aparecer uma mensagem de erro, confira se o terminal do back-end ainda está aberto.

### Teste 3 — Produtos carregados

Na seção:

```text
Monte uma lista e compare agora
```

Devem aparecer produtos como:

- Arroz Camil 5 kg;
- Feijão Kicaldo 1 kg;
- Leite Integral 1 L;
- Café Tradicional 500 g;
- Macarrão Espaguete 500 g.

### Teste 4 — Criar e comparar uma lista

Informe quantidades em pelo menos três produtos. Por exemplo:

```text
Arroz: 1
Feijão: 2
Leite: 4
```

Depois clique em:

```text
Comparar minha lista
```

O sistema deve mostrar os mercados cadastrados e seus totais.

### Teste 5 — Compra completa e parcial

Para a lista com arroz, feijão e leite, os três mercados de demonstração possuem preço para os produtos. Eles devem aparecer como compras completas.

Se futuramente você escolher um produto que não tenha preço em determinado mercado, esse mercado deverá aparecer como compra parcial e sem total completo.

### Teste 6 — Verificar os dados diretamente pela API

Na página `http://localhost:8000/docs`:

1. Abra `GET /api/products` e clique em **Try it out**.
2. Execute e confira os cinco produtos.
3. Abra `POST /api/shopping-lists`.
4. Use este corpo:

```json
{
  "name": "Compra de teste",
  "items": [
    {"product_id": 1, "quantity": 1},
    {"product_id": 2, "quantity": 2},
    {"product_id": 3, "quantity": 4}
  ]
}
```

5. Anote o `id` retornado.
6. Abra `GET /api/comparisons/{shopping_list_id}`.
7. Informe o ID da lista criada.
8. Execute e confira os totais por mercado.

## 9. O que já está sendo testado nessa versão

O teste atual valida o primeiro fluxo vertical do produto:

```text
Catálogo
→ lista de compras
→ quantidade
→ cálculo por mercado
→ resultado na interface
```

Também valida a separação técnica entre:

- front-end React;
- API FastAPI;
- banco relacional SQLite;
- modelos SQLAlchemy;
- configuração por variável de ambiente.

## 10. O que ainda não faz parte deste teste

A versão atual ainda não possui:

- cadastro de usuário pela interface;
- login real;
- senha protegida em produção;
- atualização de preço pela interface;
- leitura de código de barras;
- aplicativo Android ou iOS;
- mapa e localização;
- confirmação de preço por outros usuários;
- sistema de reputação;
- publicação em servidor online.

Esses itens fazem parte das próximas fases. O objetivo desta primeira base é validar o núcleo: lista, produtos, mercados e comparação.

## 11. Tecnologias e custos

A base atual utiliza tecnologias gratuitas ou open source:

- React;
- TypeScript;
- Vite;
- FastAPI;
- Python;
- SQLAlchemy;
- SQLite;
- PostgreSQL como opção futura;
- VS Code;
- Node.js.

Para o teste local, não há cobrança de API, hospedagem, banco online ou licença de software.

No futuro, alguns serviços externos podem possuir limites ou planos pagos, dependendo da escala, como hospedagem, mapas, notificações e serviços de dados. A decisão de usar cada serviço será feita antes da integração.

## 12. Problemas comuns

### A página abre, mas não mostra produtos

Confira se:

1. o back-end está rodando;
2. o endereço é `http://localhost:8000`;
3. o arquivo `frontend/.env` contém:

```env
VITE_API_URL=http://localhost:8000/api
```

4. o navegador foi atualizado depois de iniciar a API.

### O terminal mostra erro de porta ocupada

Outra aplicação já está usando a porta. Encerre o processo anterior ou rode a API em outra porta:

```powershell
uvicorn app.main:app --reload --port 8001
```

Se mudar a porta, atualize também o `VITE_API_URL` do front-end.

### O banco não aparece

O arquivo só é criado depois que a API inicia corretamente. Verifique:

```text
data/precomobi.db
```

Se houver um banco de teste antigo e você quiser começar novamente, pare a API, apague o arquivo e inicie de novo:

```powershell
Remove-Item .\precomobi.db
```

### O comando `npm` não existe

Instale o Node.js LTS e reinicie o VS Code.

### O comando `python` não existe

Instale o Python e marque a opção **Add Python to PATH** durante a instalação. Depois reinicie o VS Code.

## 13. Quando instalar PostgreSQL

Não é necessário instalar PostgreSQL agora. Ele passa a fazer sentido quando o projeto precisar de:

- vários usuários simultâneos;
- acesso por outros computadores;
- publicação online;
- autenticação real;
- backups e operação contínua;
- maior volume de dados.

Para aprender e validar o MVP local, SQLite é a opção mais simples, gratuita e suficiente.
