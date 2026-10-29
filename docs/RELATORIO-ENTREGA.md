# Relatório da revisão — 29/10/2026

## Origem e segurança

Fonte: PrecoMobi_Entrega_Integrada_Apresentacao_2026-10-29.zip, preservado sem alteração. Comparação com main do repositório kauanedev55-beep/precomobi confirmou mudanças de autenticação e interface ausentes no remoto. A entrega conserva essas mudanças e usa uma branch separada; main não foi substituída.

## Alterações

- Corrigido TS2345 no scanner usando a referência de vídeo validada.
- Telas divididas por lazy loading; mensagem de carregamento durante a navegação.
- Sessão obrigatória em listas/comparações; removido fallback silencioso para usuário compartilhado.
- Demonstração explícita com conta independente por visitante; aviso nas telas internas.
- Seed opt-in e identificação estável por EAN; preservação de mercados existentes.
- Observações development excluídas das consultas fora do modo demonstração.
- Listas vazias e produtos repetidos rejeitados; produtos inativos não entram em novas listas.
- Rascunho local separado por conta; falha de armazenamento local não interrompe edição.
- Verificação de resposta Supabase, confirmação e limite de senha em bytes UTF-8.
- Endereço manual na navegação e tempo limite no roteamento.
- Ajustes de cards/avisos em telas pequenas; identidade visual anterior preservada.
- Servir build pela API, scripts Render e inicialização demonstrativa Windows.
- Documentação de arquitetura, configuração, apresentação e deploy.

## Evidências executadas

Baseline do ZIP: 29 testes aprovados e 20 reprovados. Cadastro antigo esperava sessão imediata, incompatível com confirmação de e-mail. Os testes foram atualizados para capturar envio, exigir recusa antes da confirmação, confirmar o link e então autenticar.

Suite revisada: 67 testes aprovados, um aviso de depreciação da integração Starlette/AnyIO. Inclui contratos de Supabase e Open Food Facts com respostas controladas, isolamento entre usuários, recusa de token inválido, preços parciais, histórico, contribuições, confirmação única e validação de produção. Não são testes de recebimento real de e-mail.

Build Vite/TypeScript aprovado. Bundle principal ~284 KB; maior chunk de tela ~418 KB; sem aviso acima de 500 KB. Os tamanhos exatos dependem das alterações finais de CSS e estão no log de build.

Inicialização uvicorn executada com sucesso em banco exclusivo de demonstração. O navegador disponível não alcançou esse servidor local: o localhost dele respondeu por outro serviço. Por isso a inspeção visual, console, viewport desktop/mobile e jornada E2E real **não foram validados**. Não há aprovação visual de aparelhos físicos.

A URL pública existente foi aberta no navegador e apresentou a interface anterior à revisão; isso não valida este build nem comprova saúde do backend publicado. A consulta pública a /api/health/database retornou Not Found.

Smoke HTTP em processo uvicorn real aprovado: cinco rotas SPA com HTML, 404 para API inexistente, sessão demonstrativa, pesquisa, criação de lista, comparação de três mercados e consulta da lista persistida. Log incluído em docs/evidencias.

Foi adicionada validação automatizada no GitHub Actions. A execução remota do workflow precisa ser conferida após o push.

## Bloqueios e pendências

- Render sem sessão disponível: deploy não realizado; a URL existente não representa esta revisão.
- Credenciais reais Supabase/Brevo não vieram no ZIP: cadastro e e-mails reais não foram testados.
- Câmera experimental sem validação física; EAN manual preservado.
- Busca por nome ainda local; preços reais dependem de contribuições e não de Open Food Facts.
- Região fixa Laranjeiras, Serra/ES; seleção automática de mercados próximos não implementada.
- Coordenadas herdadas sem verificação independente; não tratadas como validação factual.
- Sem migração/backup de produção executados e sem ensaio PostgreSQL real.
- O modo público de demonstração cria contas persistentes; falta política administrativa de limpeza/limitação de uso.
- Antes de produção geral: validar limitação de tentativas, política de sessão e auditoria de dependências.

Esta é uma revisão compilável e validada por testes de API, com publicação e validação visual pendentes; não é certificação de aplicação pronta em produção.
