# Instalação e configuração

Use os comandos do README a partir da raiz `precomobi-completo`. Instale as dependências com `npm ci` e `pip install -r backend/requirements-dev.txt`; pytest e httpx estão incluídos.

## Contas existentes

Preserve seus .env locais. O pacote não inclui segredos. Copie backend/.env.example e frontend/.env.example apenas se ainda não houver arquivos reais; preencha em ambiente privado. Os scripts antigos de preparação só encontram caminhos específicos do computador original. O novo INICIAR-DEMONSTRACAO.ps1 independe deles.

Backend: SUPABASE_URL e SUPABASE_ANON_KEY para validar a identidade; SECRET_KEY para assinar a sessão da API; DATABASE_URL para persistência; FRONTEND_URL e CORS_ORIGINS com as URLs corretas. BREVO_API_KEY e EMAIL_FROM controlam o envio de boas-vindas pela API HTTPS da Brevo. O SMTP da Brevo pode estar configurado na conta Supabase para os e-mails de confirmação.

Frontend: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são configuração pública, nunca use service_role. VITE_API_URL pode ser /api na publicação unificada e no desenvolvimento com proxy do Vite. Configure no Supabase os redirects /confirmar-email e /redefinir-senha para cada origem autorizada e mantenha a confirmação de e-mail habilitada.

## Dados

DEMO_MODE=false é o padrão: não cria seed e não exibe observações development. DEMO_MODE=true prepara os exemplos da apresentação sem sobrescrever mercados já cadastrados. O modo é global do ambiente: use um banco exclusivo para demonstração; não misture usuários reais e uma apresentação pública. O demonstrador cria uma conta independente por acesso, mantida no banco; a limpeza administrativa dessas contas fica pendente.

A pesquisa por nome consulta o catálogo local. EAN de 8, 12, 13 ou 14 dígitos pode importar a identificação do Open Food Facts. A API não fornece preços de supermercados.
