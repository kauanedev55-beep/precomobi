# Teste manual do MVP

## 1. Iniciar o back-end

No PowerShell, dentro de `backend`:

```powershell
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Na primeira inicialização, o sistema cria `precomobi.db`, tabelas e dados de desenvolvimento.

## 2. Iniciar o front-end

Em outro terminal, dentro de `frontend`:

```powershell
copy .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173`.

## 3. Testar pela interface

Na seção `Monte uma lista e compare agora`:

1. Aguarde os produtos aparecerem.
2. Informe quantidades em pelo menos dois produtos.
3. Clique em `Comparar minha lista`.
4. Verifique os três mercados e os totais.
5. Confirme que o primeiro mercado completo é destacado.

## 4. Testar pela documentação da API

Abra `http://localhost:8000/docs`.

Fluxo mínimo:

1. `GET /api/products` para descobrir IDs.
2. `POST /api/shopping-lists` para criar uma lista.
3. `GET /api/comparisons/{shopping_list_id}` para ver a comparação.

Exemplo de corpo:

```json
{
  "name": "Compra da semana",
  "items": [
    {"product_id": 1, "quantity": 1},
    {"product_id": 2, "quantity": 2}
  ]
}
```

## 5. Regra que deve ser observada

A comparação usa o preço mais recente por produto e mercado. O mercado só recebe um total quando possui preço para todos os produtos da lista. Os demais aparecem como compra parcial.

## Limite conhecido desta etapa

O usuário de demonstração é fixo para permitir testar o fluxo sem autenticação. Cadastro, login e autorização real ainda precisam ser implementados antes do MVP final.
