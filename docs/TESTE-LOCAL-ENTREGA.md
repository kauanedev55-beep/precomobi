# PreçoMobi: pacote para testes locais

## Origem e segurança

Cópia de trabalho da versão com Supabase/Brevo, integração EAN Open Food Facts e frontend modernizado. Não inclui `.env`, banco local, Git, senhas, tokens, `.venv` ou `node_modules`. **Não sobrescrever a pasta que já está no computador.**

O pacote é uma prévia de teste, **não uma versão pronta para publicação**. Foram preservados os arquivos originais de integração com Supabase, Brevo, FastAPI e configurações de ambiente de exemplo. Nenhuma configuração do Render foi modificada.

## Instalação no Windows

1. Extrair o ZIP em outra pasta, por exemplo `C:\PrecoMobi-Teste\precomobi-completo`.
2. Copiar **somente os valores de configuração que você já utiliza** de seus arquivos `.env` locais para os novos `frontend/.env` e `backend/.env`, sem compartilhá-los em conversas nem enviar ao GitHub. A estrutura de variáveis está nos `.env.example`.
3. Abra a pasta extraída no VS Code.
4. Abra terminal PowerShell 1 e execute: `powershell -ExecutionPolicy Bypass -File .\INICIAR-BACKEND.ps1`.
5. Abra terminal PowerShell 2 e execute: `powershell -ExecutionPolicy Bypass -File .\INICIAR-FRONTEND.ps1`.
6. Acesse `http://127.0.0.1:8000/api/health` e `http://127.0.0.1:5173`.

**ATENÇÃO:** Esta cópia pode apontar para serviços externos reais caso sejam reutilizadas as mesmas credenciais. Prefira contas de teste; não execute testes destrutivos ou migrações de produção.

## Testes manuais

- Verificar se a página pública abre e se o login funciona com uma conta de teste já existente.
- Abrir Encontrar produtos > Ler código de barras; confirmar abertura da câmera e preferência pela traseira quando disponível.
- Testar o código manual `3017620422003`. A API precisa estar funcionando; se o Open Food Facts estiver acessível, deve retornar os dados do produto.
- Testar com um código de tamanho inválido e verificar a mensagem de erro.
- Testar criação e edição de uma lista de teste, comparação e abertura do mapa, sem considerar os preços de demonstração reais.

## Validação automatizada (executar com servidores parados ou outro terminal)

No terminal de frontend: `cd frontend; npm run build`.

No backend (a partir da raiz): `cd backend; .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt; .\.venv\Scripts\python.exe -m pytest -q ..\tests`.

Se uma etapa falhar, registre o erro completo antes de publicar.

## Alterações desta entrega

- `frontend/src/components/BarcodeScanner.tsx`: resolução ideal 1080p, preferência por câmera traseira, formatos EAN/UPC/Code128, leitura manual e liberação de recursos.
- `INICIAR-BACKEND.ps1` e `INICIAR-FRONTEND.ps1`: inicializadores locais.
- Documentação deste pacote.

## O que ainda falta

Pesquisa externa por nome, preços reais auditados, lista e comparação de ponta a ponta, validação mobile por HTTPS, build/testes no Windows e auditoria de autenticação dual antes de qualquer publicação.
