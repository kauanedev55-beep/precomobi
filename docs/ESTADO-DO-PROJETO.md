# PreçoMobi — Estado da entrega de apresentação

Atualização: 29/10/2026.

## Confirmado pelo usuário na versão local anterior
- FastAPI inicializou e respondeu à aplicação.
- A busca pelo EAN 3017620422003 encontrou o produto Nutella via Open Food Facts.
- Frontend compilou com `npm run build` após ajuste do BarcodeScanner.
- A câmera abriu com imagem em 1280 × 720, mas **a leitura automática não funcionou**.

## Implementado na cópia desta entrega
- Página pública, login/cadastro, lista de compras, comparação, mapa, contribuições e histórico.
- Busca EAN local com importação Open Food Facts para EAN válido.
- Identificação explícita dos **preços de desenvolvimento** em comparações e detalhe do produto.
- Confirmações detalhadas de preços recolhidas em `<details>` para reduzir ruído.
- Scripts locais que preservam os arquivos .env no computador, sem incluí-los no pacote.

## NÃO comprovado nesta entrega
- Testes automatizados de backend: dependências de terceiros ausentes no ambiente do pacote.
- Build do frontend desta cópia: npm ci indisponível por falha de acesso ao registro.
- Fluxo completo em navegador, celulares e Render.
- Compatibilidade de autenticação Supabase / autenticação própria com as variáveis já publicadas.
- Persistência dos dados após reinício ou redeploy no Render.

## Pendências deliberadas
1. Leitura automática de código de barras, mantendo a entrada manual como alternativa.
2. Preços reais por supermercado com origem, data e cobertura verificáveis.
3. Busca externa por texto: catálogo local filtra por nome; importação externa atual ocorre por EAN.
4. Validar permissões, sessão e deploy antes de abrir para usuários reais.

**Esta é uma versão candidata à apresentação acadêmica, não uma certificação de produção.**
