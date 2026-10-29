# Publicação no serviço existente

Não foi feito deploy: o Render apresentou a tela de login, sem sessão disponível. Não foram lidas ou alteradas suas variáveis e o banco de produção. Nenhum recurso pago foi criado.

## Configuração proposta para revisão no Render

Manter o repositório existente e o serviço/domínio já utilizado. Conferir primeiro a branch atualmente publicada e salvar as configurações antes de alterar.

- Diretório raiz: raiz do repositório.
- Build: `bash scripts/build-render.sh`.
- Start: `bash scripts/start-render.sh`.
- Health: `/api/health/database`.
- APP_ENV=production, SECRET_KEY própria longa, DATABASE_URL PostgreSQL persistente, FRONTEND_URL=https://precomobi-1.onrender.com, CORS_ORIGINS com a origem real.
- VITE_API_URL=/api; VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no build.
- SUPABASE_URL, SUPABASE_ANON_KEY e BREVO_API_KEY e EMAIL_FROM existentes no runtime.
- DEMO_MODE=true somente em ambiente de apresentação explicitamente identificado; false para dados reais.

Não habilite APP_ENV=production no serviço atual antes de confirmar PostgreSQL e a chave existentes: a nova validação recusa configurações inseguras. Não crie um banco pago. Se nenhum PostgreSQL gratuito já estiver disponível, a publicação persistente fica bloqueada até uma escolha do responsável.

## Banco e migração

Faça backup pelo método do banco atual e teste a restauração em ambiente separado. Inventarie tabelas/contagens e identifique SQLite versus PostgreSQL. A passagem SQLite → PostgreSQL exige exportação/importação validada de IDs, relacionamentos, valores Decimal e datas. Não execute migração direta no banco real sem esse ensaio. Esta revisão fornece a compatibilidade de conexão, sem alegar uma migração executada.

## Após a publicação

Acesse /api/health e /api/health/database, abra a raiz e recarregue /login e /lista. Confirme um cadastro real de teste no Supabase; confira boas-vindas, login/logout e isolamento entre duas contas. Execute lista → comparação → mapa em desktop e celular. Se falhar, volte à branch/commit anterior preservando o banco. Registre resultados antes de apresentar o link como entrega publicada.
