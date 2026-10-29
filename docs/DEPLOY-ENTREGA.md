# Publicação no serviço existente

## Configuração confirmada no Render

Workspace Preço Mobi, repositório kauanedev55-beep/precomobi. Ambos os serviços acompanham main com deploy automático por commit.

| Serviço | Tipo e plano | Raiz | Build | Execução / publicação |
| --- | --- | --- | --- | --- |
| precomobi-1 | Static site | frontend | npm install && npm run build | dist, https://precomobi-1.onrender.com |
| precomobi | Web service Python, free | backend | pip install -r requirements.txt | uvicorn main:app --host 0.0.0.0 --port $PORT, https://precomobi.onrender.com |

Preservar essa divisão e as URLs existentes. Os scripts unificados adicionados são uma alternativa para execução local ou outro arranjo futuro; não é necessário mudar a raiz dos serviços atuais.

Frontend: VITE_API_URL=https://precomobi.onrender.com/api; VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem corresponder à conta existente. Backend: CORS_ORIGINS deve incluir https://precomobi-1.onrender.com; FRONTEND_URL com essa mesma origem; SUPABASE_URL, SUPABASE_ANON_KEY, BREVO_API_KEY e EMAIL_FROM existentes. Não foi possível inspecionar os valores atuais.

## Estado da revisão

Código na branch entrega/refinamento-2026-10-29, PR #1 em rascunho. Os dois checks do GitHub Actions do commit corrigido 2835050 passaram: build, testes de API e smoke HTTP. Main não foi alterada. Nenhum deploy ou atualização de variáveis de produção foi executado.

A API pública respondeu {"status":"ok","database":"connected"} após sair da suspensão. Essa resposta não informa qual banco está configurado. Nenhum PostgreSQL apareceu no inventário do Render; um PostgreSQL externo ainda é possível.

## Bloqueio para publicar

A integração Render instalada lê serviços e permite mesclar variáveis, mas não oferece leitura dos valores atuais. A conferência no painel exigiu autenticação: a escolha do usuário avançou Render → GitHub → Google, e a revisão automática bloqueou a continuação desse fluxo. Não houve tentativa de contorno.

Antes de publicar, confirmar com acesso autorizado: tipo e URL do banco sem divulgar credenciais, backup restaurável, configuração Supabase/Brevo, chave de assinatura e redirects. Não habilitar APP_ENV=production antes de confirmar PostgreSQL persistente e SECRET_KEY longa; essa opção rejeita SQLite e a chave padrão.

## Banco e migração

Não migrar um banco real sem backup e ensaio em ambiente separado. Inventariar tabelas e contagens, preservar IDs/relacionamentos/Decimal/datas e validar login e listas após o ensaio. Não criar recursos pagos sem autorização. Não foi criado PostgreSQL nem alterado o banco atual.

## Depois da liberação

Publicar o código validado preservando as raízes atuais, acompanhar os dois deploys automáticos e testar os endpoints de saúde na API real. No frontend, validar cadastro confirmado, e-mail, login/logout, isolamento entre contas e lista → comparação → mapa em desktop e celular. O rollback de código deve preservar o banco.
