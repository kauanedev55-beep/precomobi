# Front-end do PreçoMobi

## Requisitos

- Node.js 20 ou superior;
- npm.

## Configuração

No diretório `frontend`, copie `.env.example` para `.env`:

```powershell
copy .env.example .env
```

A variável padrão aponta para a API local:

```env
VITE_API_URL=http://localhost:8000/api
```

## Instalação e execução

A partir da raiz do projeto:

```powershell
cd frontend
npm install
npm run dev
```

A interface ficará disponível em `http://localhost:5173`.

O botão `Testar conexão` chama o endpoint `/api/health` do back-end.
