# PreçoMobi

Monte sua lista, compare os preços cadastrados de até três mercados e abra a rota para o escolhido. Projeto de Análise e Desenvolvimento de Sistemas de Rafael Baldi Serpa e Kauane Silva Almeida dos Santos.

## Demonstração rápida no Windows

Requisitos: Python 3.12 e Node.js 22 LTS com npm.

Na pasta extraída, execute `./INICIAR-DEMONSTRACAO.ps1` pelo PowerShell. Abra http://127.0.0.1:8000/login e escolha **Explorar demonstração**. Cada visitante recebe uma conta separada. Os preços de exemplo são identificados em todas as páginas internas; não representam ofertas atuais.

Esse modo funciona sem Supabase/Brevo para apresentar listas e comparação. O cadastro e login normais continuam usando Supabase e exigem a configuração das contas existentes.

## Desenvolvimento

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
npm --prefix frontend ci
# Terminal 1, dentro de backend:
DEMO_MODE=true ../.venv/bin/python -m uvicorn main:app --reload
# Terminal 2, na raiz:
npm --prefix frontend run dev
```

Abra http://localhost:5173. No Windows use `.venv\Scripts\python.exe` e `$env:DEMO_MODE='true'`. Variáveis existentes não são alteradas pelos comandos acima, salvo a opção de demonstração indicada. Não envie seus arquivos .env ao GitHub.

## Validação

```bash
.venv/bin/python -m pytest tests -q
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Os testes usam exclusivamente um banco temporário, mensagens capturadas e respostas externas simuladas para validar contratos. Não enviam e-mails reais.

## Documentação da entrega

- [Instalação e configurações](docs/INSTALACAO-ENTREGA.md)
- [Arquitetura e tecnologias](docs/ARQUITETURA-ENTREGA.md)
- [Roteiro de cinco minutos](docs/ROTEIRO-APRESENTACAO.md)
- [Testes e limitações](docs/RELATORIO-ENTREGA.md)
- [Publicação segura](docs/DEPLOY-ENTREGA.md)

As notas anteriores em docs são histórico. Os documentos com sufixo ENTREGA e o roteiro acima descrevem esta revisão. **Publicação no Render e testes visuais em navegador ainda dependem da validação descrita no relatório.**
