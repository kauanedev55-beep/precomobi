# Testes e validações

## Executados nesta cópia
- `python -m compileall`: registrar execução no relatório de entrega.
- Inspeção estrutural de arquivos e configuração sem incluir credenciais.

## No Windows (antes de publicar)
1. Iniciar backend: `powershell -ExecutionPolicy Bypass -File .\INICIAR-BACKEND.ps1`
2. Iniciar frontend: `powershell -ExecutionPolicy Bypass -File .\INICIAR-FRONTEND.ps1`
3. Em outro terminal: `powershell -ExecutionPolicy Bypass -File .\TESTAR-APRESENTACAO.ps1`
4. Navegador: cadastro/login, busca `3017620422003`, lista de arroz/feijão, comparação, mapa.
5. Registrar resultado real de cada etapa, inclusive falhas.

**A câmera automática não é critério de aprovação desta apresentação, mas deve ser explicitamente declarada como pendência.**
**Não executar testes destrutivos no banco de produção.**
