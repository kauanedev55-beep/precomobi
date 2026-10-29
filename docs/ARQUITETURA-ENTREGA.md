# Arquitetura da entrega

React 19 + TypeScript + Vite compõem a interface. React Router divide as telas por carregamento sob demanda; Leaflet e ZXing são carregados junto às telas correspondentes. CSS responsivo, foco visível e redução de movimento já presentes foram preservados. A revisão acrescenta aviso de demonstração, ajustes de cards e entrada manual de endereço para navegação externa.

FastAPI + Pydantic validam as requisições. SQLAlchemy mantém usuários, produtos, mercados, listas, itens, observações e confirmações. SQLite atende o desenvolvimento; PostgreSQL com psycopg atende produção. Produção rejeita SQLite e a chave de assinatura padrão. A inicialização mantém a migração aditiva de campos de confirmação herdada; nenhuma migração de banco real foi executada nesta revisão.

Supabase autentica e confirma e-mails. A API consulta /auth/v1/user, exige identidade confirmada e emite sua sessão HMAC existente. A autenticação local anterior continua disponível para compatibilidade e testes. Endpoints privados exigem sessão e verificam dono da lista. Leituras públicas aceitam ausência de token; um token inválido é recusado.

A API HTTPS da Brevo existente envia boas-vindas a uma nova conta sincronizada no primeiro acesso. O recebimento real não foi testado. A revisão preserva a API Brevo existente, sem trocar serviço ou credenciais.

O catálogo importa identificação do Open Food Facts por EAN sem inventar preço. Comparações escolhem a observação ativa mais recente por produto/mercado, multiplicam pela quantidade em Decimal e omitem total se faltar item. Apenas listas completas entram no destaque de menor total. A resposta limita a três mercados; ainda não escolhe mercados dinamicamente pela proximidade. A cobertura de demonstração é Laranjeiras, Serra/ES.

OpenStreetMap fornece os tiles; OSRM estima trajeto por ruas. O usuário pode abrir navegação no Google Maps usando localização autorizada ou endereço manual. Coordenadas são enviadas ao OSRM quando se calcula o trajeto; o endereço manual é enviado ao Google Maps ao abrir a navegação. As coordenadas das lojas vieram do pacote anterior e não foram verificadas nesta revisão.

Quando frontend/dist existe, FastAPI serve a interface e o fallback de rotas SPA na mesma origem; /api inexistente continua 404. Scripts de build e start podem ser usados no serviço Render existente.
