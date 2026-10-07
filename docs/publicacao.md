# PreçoMobi — Publicar online (gratuito)

## A decisão: por quê Render + GitHub

| | O que é | Para quê | Custo | Cartão? |
|---|---|---|---|---|
| **GitHub** | Onde o código do projeto fica guardado (controle de versão) | O Render publica direto a partir daqui — você dá um `git push` e ele atualiza sozinho | Gratuito | Não |
| **Render** | Hospedagem | Roda o backend (FastAPI) **e** o frontend (site), os dois no mesmo painel | Gratuito (plano "Free") | Não |

**Por que não outra coisa:** pesquisei as opções atuais e o Render é hoje uma das poucas hospedagens realmente gratuitas, sem pedir cartão, que publica tanto uma API Python quanto um site estático no mesmo lugar — evita ter que usar dois serviços diferentes.

**Limite a saber, para não ter susto na apresentação:**
- O backend gratuito **"dorme" depois de 15 minutos sem uso**, e demora de 30 a 60 segundos para "acordar" na próxima visita. **Antes da apresentação, abra o link do PreçoMobi uns 2 minutos antes** só para acordar a API.
- Os dados do banco (SQLite) **continuam lá enquanto o serviço não for atualizado de novo** (um novo `git push`). Se você publicar uma nova versão do código, o banco volta para os dados de desenvolvimento — isso é esperado e não é um defeito.
- Gratuito "para sempre", mas é importante nunca colocar um cartão lá — o plano Free não precisa disso.

Se algum dia isso deixar de ser gratuito ou os limites apertarem, a alternativa é hospedar num servidor próprio (ex.: uma VPS de poucos reais por mês) — não é necessário agora.

## Passo 1 — Colocar o projeto no GitHub

Se você **já tem conta no GitHub e já sabe usar `git`**, pule para o passo 2.

1. Crie uma conta gratuita em **github.com** (se ainda não tiver).
2. No terminal, na **raiz** do projeto, confira se o `git` está instalado:
   ```powershell
   git --version
   ```
   Se der erro, baixe em **git-scm.com** (gratuito), instale com as opções padrão, e feche/abra o terminal de novo.
3. Ainda na raiz do projeto:
   ```powershell
   git init
   git add .
   git commit -m "PreçoMobi - versão inicial"
   ```
4. No site do GitHub, clique em **"New repository"**, dê o nome `precomobi`, deixe **Public** (ou Private, tanto faz), **não** marque nenhuma opção de criar README/licença, e clique em **Create repository**.
5. O GitHub vai mostrar uns comandos. Use estes (troque `SEU-USUARIO` pelo seu usuário do GitHub):
   ```powershell
   git remote add origin https://github.com/SEU-USUARIO/precomobi.git
   git branch -M main
   git push -u origin main
   ```
   Ele vai pedir para você logar — siga as instruções na tela (abre o navegador).

**Importante:** o `data/precomobi.db` e as pastas `node_modules`/`.venv` **não devem subir** para o GitHub (são pesadas e específicas do seu computador). O projeto já tem um arquivo `.gitignore` que cuida disso sozinho.

## Passo 2 — Publicar o backend (API)

1. Crie uma conta gratuita em **render.com** (dá para entrar direto com a conta do GitHub).
2. No painel do Render, clique em **New → Web Service**.
3. Conecte sua conta do GitHub e escolha o repositório `precomobi`.
4. Preencha:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
5. Em **Environment Variables**, adicione:
   - `CORS_ORIGINS` = (deixe em branco por enquanto, voltamos aqui no passo 3)
   - `SECRET_KEY` = invente uma frase longa e aleatória só sua (ex.: `troque-por-algo-bem-aleatorio-123`)
   - (Opcional) as 4 variáveis de e-mail, se você configurou o Gmail
6. Clique em **Create Web Service**. Vai demorar alguns minutos na primeira vez.
7. Quando terminar, o Render te dá uma URL tipo `https://precomobi-api.onrender.com`. **Guarde essa URL.**
8. Teste abrindo `https://SUA-URL.onrender.com/docs` no navegador — deve abrir o Swagger, igual no seu computador.

## Passo 3 — Publicar o frontend (site)

1. No painel do Render, **New → Static Site**.
2. Escolha o mesmo repositório `precomobi`.
3. Preencha:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = `https://SUA-URL-DA-API.onrender.com/api` (a URL que você guardou no passo 2, **com `/api` no final**)
5. Clique em **Create Static Site**. Ele também te dá uma URL, tipo `https://precomobi.onrender.com`.

## Passo 4 — Ligar os dois (CORS)

Agora que você tem a URL do site, volte na API:

1. No Render, abra o serviço do **backend**.
2. Vá em **Environment**, edite `CORS_ORIGINS` e coloque a URL do **frontend** (a do passo 3), exatamente como apareceu, sem barra no final. Exemplo: `https://precomobi.onrender.com`
3. Salve — o Render reinicia a API sozinho.

## Passo 5 — Testar

Abra a URL do frontend num navegador (de preferência numa aba anônima, para simular alguém de fora). Faça login com a conta de demonstração, monte uma lista, compare. Se der erro de conexão, espere 1 minuto (API "acordando") e tente de novo.

## Sempre que você alterar o código

```powershell
git add .
git commit -m "descreva o que mudou"
git push
```

O Render detecta o `push` e publica a nova versão sozinho, em 1 a 3 minutos.
