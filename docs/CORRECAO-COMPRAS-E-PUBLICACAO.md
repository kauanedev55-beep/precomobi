# Compras, mercados e publicação — 29/10/2026

## Diagnóstico confirmado

- O usuário informou que os cadastros aparecem no projeto local.
- As leituras públicas do Render retornaram `[]` em `/api/markets` e `/api/products`.
- O JavaScript publicado usa `https://precomobi.onrender.com/api`, sem localhost.
- Portanto, os cadastros locais ainda não estão na base consultada no Render.
- Supabase Auth guarda as identidades de login; isso não transfere automaticamente
  as tabelas de mercados, produtos, listas ou preços do SQLite do computador.
- O serviço backend é gratuito. Não há PostgreSQL gerenciado no workspace Render.
  Sem configuração de persistência, o SQLite no filesystem do serviço pode se perder
  em reinícios e deploys. Não publicar sobre esse banco antes da cópia de segurança.

## Mudanças

- A comparação retorna todos os mercados ativos, sem o corte silencioso de três.
- Usa o preço ativo mais recente por produto/mercado, mantendo o histórico.
- Total completo somente quando todos os produtos têm preço; subtotal parcial e
  quantidade de itens faltantes aparecem separadamente.
- Se faltarem preços, a comparação parcial usa a interseção dos produtos dos
  mercados com alguma cotação. Lojas sem cotação continuam visíveis, mas não
  participam da economia. Subtotais de cestas diferentes não competem entre si.
- Endereço e coordenadas acompanham a comparação. Google Maps abre por coordenadas
  válidas ou pelo nome e endereço completo. O usuário deve conferir o resultado
  da busca quando não houver coordenadas verificadas.
- O mapa lista lojas sem coordenadas também; somente os marcadores exigem lat/lon.
- Avaliação de deslocamento compara dois totais equivalentes e seus custos de ida
  e volta informados pelo usuário. Pode estimar com a rota OSRM e custo por km
  fornecido, usando 2 × ida como aproximação de ida/volta, claramente identificada.
  Não inclui automaticamente pedágios, estacionamento ou valor do tempo.
- Rotas dependem da permissão de localização e da disponibilidade do OSRM público.
  Permissão negada ou ausência de rota não impede Maps nem custos manuais.
- Atualização de comparação ao voltar à aba e botão de atualização. API sem cache.
- Leitor aceita EAN/UPC e QR de produto com EAN, JSON com EAN textual ou URL de produto.
  Não abre URLs arbitrárias, não importa preço de QR sem validação e não interpreta
  QR de NFC-e como se fosse um produto. Importação automática de nota fiscal não
  existia no código e continua pendente de integração específica.
- Leitura também disponível ao informar um preço, selecionando o produto. O usuário
  informa o preço observado e o mercado real; a API grava uma nova observação.
- Ajustes de colunas, botões, formulários, tabelas e modal da câmera para telas estreitas.
- Removidas referências indevidas a colunas de autenticação nos modelos de catálogo.
  Nenhuma coluna existente é removida do banco. Campo opcional de imagem é adicionado
  em bancos antigos se necessário.

## Transferir os dados reais com segurança

É necessário o arquivo original `data/precomobi.db` do projeto local. Não publicar
esse arquivo em GitHub, não substituir pelo banco de demonstração e não transformar
preços marcados `development` em preços reais.

1. Encerre o backend local para congelar os cadastros e guarde uma cópia da pasta
   `data`. Caso o caminho configurado em `DATABASE_URL` seja outro, use esse arquivo.
2. No projeto Supabase existente, obtenha a conexão PostgreSQL do **Session pooler**
   em **Connect**. O backend deve usar credencial de banco; a chave pública de Auth
   não serve como senha PostgreSQL. Inclua TLS (`sslmode=require`). Mantenha a
   conexão em variável de ambiente segura, nunca em código, comando público ou chat.
3. Instale as dependências de backend. Defina `TARGET_DATABASE_URL` no ambiente do
   terminal da migração (não gravar no repositório).
4. Execute primeiro o plano, sem escrita no destino:

   ```text
   python scripts/migrate_catalog.py --source data/precomobi.db
   ```

5. Confira contagens de usuários, mercados, produtos, preços e listas. Depois:

   ```text
   python scripts/migrate_catalog.py --source data/precomobi.db --apply
   ```

   O script cria backup consistente do SQLite antes de copiar, verifica integridade,
   preserva IDs e relacionamentos, verifica contagens e ajusta sequências PostgreSQL.
   O arquivo original é aberto somente para leitura. Se o destino já tiver registros
   em tabelas da aplicação ou houver tabelas/colunas desconhecidas, interrompe para
   revisão; não apaga nem mescla por suposição. A cópia SQL ocorre em transação.
   Interrompa escritas da aplicação durante a migração.

6. No backend Render existente, configure `DATABASE_URL` com a mesma conexão,
   `APP_DB_SCHEMA=precomobi`, `DEMO_MODE=false`, além das variáveis de autenticação,
   CORS e URL do frontend já existentes. O script usa schema privado `precomobi`:
   não adicioná-lo à lista de schemas expostos da Data API Supabase.
   `auth.users` não é alterada pelo script. Usuários locais continuam vinculados por
   e-mail na troca de sessão Supabase; senhas locais não criam identidades Supabase.
7. Só então publicar o commit validado no backend e no frontend. Não recriar os
   serviços ou o projeto Supabase. Manter o rewrite `/*` → `/index.html` no frontend.
8. Confirmar no PC e celular os mesmos IDs e contagens de mercados/produtos. Entrar
   na mesma conta, montar lista real, comparar, gravar preço observado, atualizar e
   verificar o resultado. Testar câmera em aparelho real com permissão e HTTPS.

Variáveis do frontend (valores já configurados devem ser preservados):

```text
VITE_API_URL=https://precomobi.onrender.com/api
VITE_SUPABASE_URL=<URL do projeto existente>
VITE_SUPABASE_ANON_KEY=<chave pública do projeto existente>
```

## Limites da validação

Testes automatizados usam bases temporárias e dados de teste isolados. Não alteram
os cadastros do usuário. Não constituem validação de preço real, coordenada comercial,
leitura óptica em câmera física ou importação PostgreSQL real sem a conexão do usuário.
A versão deve permanecer em branch separada até que haja backup e destino persistente.

## Resultados desta revisão

- 72 testes de backend aprovados, incluindo catálogo compartilhado, mais de três
  mercados, preços atualizados, comparação parcial e preservação em migração.
- 6 testes de frontend aprovados: QR/EAN, Google Maps, validação de rotas e cálculo
  da economia após deslocamento.
- Build TypeScript/Vite aprovado.
- Smoke HTTP aprovado: cinco rotas SPA, pesquisa, lista salva, comparação, leitura
  posterior do banco temporário e resposta 404 correta da API.
- O banco local real e uma conexão PostgreSQL ainda não foram fornecidos. A
  migração e publicação não foram executadas. Câmera física e fluxo autenticado
  em celular real ainda precisam de conferência após a publicação com os dados.
