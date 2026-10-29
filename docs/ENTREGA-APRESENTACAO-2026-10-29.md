# PreçoMobi — candidato para apresentação (29/10/2026)

## Escopo
Versão local para demonstrar o fluxo: apresentação/login → produtos → lista → comparar até três mercados → mapa/rota. Arquivos construídos a partir do pacote de testes anterior, preservando backend e autenticação existente. **Não é um lançamento validado para usuários reais**.

## Implementado na base
- Backend FastAPI, frontend React/Vite, Supabase Auth e integração SMTP já existente, com ambiente local fornecido pelo usuário.
- Pesquisa de produto por EAN; consulta ao Open Food Facts já validada no computador do usuário.
- Busca local por nome, montagem de lista, comparação de mercados e página de mapa presentes no código.
- Scanner de barras com ZXing e fallback nativo, além da digitação manual.

## Pendências / limitações
- Leitura automática pela câmera **não validada**, explicitamente adiada.
- Pesquisa externa ampla por nome ainda não implementada. Busca por nome usa base local.
- Valores dos mercados de desenvolvimento **não representam preços reais** e não devem ser anunciados como tal.
- Persistência/segurança/fluxo completo no Render não foram auditados; a autenticação deve ser testada no ambiente publicado.
- Teste de navegador/mobile não executado nesta entrega.

## Não alterar na publicação sem auditoria
- Variáveis de ambiente do Render, banco de produção, credenciais Supabase/Brevo, URLs e autenticação.
- Não executar `git reset --hard`, `git clean -fd` nem sobrescrever o repositório remoto sem revisão.
- Verificar os serviços Render existentes e sua configuração de build antes de subir qualquer branch.

## Demonstração honesta sugerida
1. Abra a página inicial, autentique com conta de testes própria.
2. Busque produtos locais por nome ou Nutella EAN `3017620422003` (depende do acesso à API).
3. Adicione itens à lista e ajuste as quantidades.
4. Salve a lista e compare os três mercados, avisando sobre preços de desenvolvimento.
5. Escolha um mercado e abra o mapa/rota.
6. Mostre EAN manual como fallback e descreva a leitura automática como melhoria futura.
