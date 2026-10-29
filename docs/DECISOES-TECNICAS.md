# Decisões técnicas

1. Preservar a arquitetura e a autenticação do pacote recebido; não migrar banco sem plano de migração.
2. Marcar preços de desenvolvimento como exemplos.
3. Não publicar automaticamente nem atualizar Render antes de build, testes, integração e checagem do banco persistente.
4. Manter leitor de EAN manual como alternativa; reconhecimento automático aguardará revisão futura.
5. Não incluir arquivos `.env`, banco de dados, `.git`, `.venv` ou `node_modules` na entrega.
