# PreçoMobi

Projeto web para comparação colaborativa de preços de supermercados.

## Estrutura organizada

Cada parte do sistema possui sua própria pasta. A raiz não contém arquivos de código misturados.

```text
precomobi/
├── backend/                 # Aplicação Python/FastAPI
│   ├── app/                 # Pacote Python e módulos da API
│   │   ├── api/             # Rotas HTTP
│   │   ├── core/            # Configurações
│   │   ├── db/              # Sessão, base e inicialização do banco
│   │   ├── models/          # Entidades SQLAlchemy
│   │   ├── schemas/         # Schemas Pydantic
│   │   └── services/        # Serviços de negócio
│   ├── .venv/               # Ambiente virtual Python local
│   ├── .env.example         # Configuração da API
│   ├── main.py              # Entrada da API
│   └── requirements.txt
├── frontend/                # Aplicação React/Vite
│   ├── src/                 # Componentes, serviços e estilos
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── tests/                   # Testes automatizados
├── data/                    # Banco SQLite local
│   └── precomobi.db
├── docs/                    # Documentação técnica e guias
├── scripts/                 # Scripts auxiliares
├── .vscode/                 # Tarefas e depuração
├── .gitignore
└── README.md
```

A raiz contém apenas arquivos de organização. O código Python fica em `backend` e o código React fica em `frontend`.

## Iniciar o back-end

Abra o terminal na raiz do projeto e execute:

```powershell
cd backend
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Em instalações futuras, se o ambiente já existir, use apenas:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload
```

A API ficará em:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/api/health
```

Health do banco:

```text
http://localhost:8000/api/health/database
```

## Iniciar o front-end

Abra um segundo terminal na raiz:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

A interface ficará em:

```text
http://localhost:5173
```

## Banco de dados

O SQLite é criado automaticamente em:

```text
data/precomobi.db
```

A configuração padrão está em `backend/.env.example`:

```env
DATABASE_URL=sqlite:///../data/precomobi.db
```

Esse caminho funciona porque o comando da API é executado dentro de `backend`.

Para reiniciar os dados de demonstração:

```powershell
# com a API parada, a partir da raiz
Remove-Item .\data\precomobi.db
```

Depois inicie a API novamente.

## Verificar imports

Com o terminal dentro de `backend` e o ambiente virtual ativado:

```powershell
python -c "import app; print(app)"
python -c "from app.api.catalog import router; print('catalog OK')"
python -c "from app.api.comparisons import router; print('comparisons OK')"
python -c "from app.api.health import router; print('health OK')"
python -c "from app.api.shopping_lists import router; print('shopping_lists OK')"
python -c "from app.core.config import get_settings; print('config OK')"
python -c "from app.db.init_db import init_db; print('database OK')"
```

## VS Code

Abra a pasta raiz `precomobi` no VS Code.

Use **Terminal > Run Task** para executar:

- `PreçoMobi: iniciar API`;
- `PreçoMobi: iniciar front-end`.

A configuração da API em `.vscode/launch.json` usa:

```text
cwd: backend
module: uvicorn
args: main:app --reload
```

## Documentação

- [Guia de teste do zero](docs/guia-teste-do-zero.md)
- [Teste do MVP](docs/teste-mvp.md)
- [Arquitetura](docs/arquitetura.md)
- [Banco de dados](docs/banco-de-dados.md)
