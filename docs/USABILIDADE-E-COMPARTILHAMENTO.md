# Compartilhar e usar a lista no celular

## Fluxo entregue

- Compartilhar aparece ao montar a lista, na cesta, na comparação, nas listas salvas do responsável e na lista compartilhada, inclusive após a compra ser concluída.
- Para um rascunho, a ação salva o estado atual pelo mesmo método de salvamento já utilizado e depois gera o convite. Não exige passar primeiro pela seção Salvar. Listas já salvas conservam o ID: não é criada uma cópia para compartilhar.
- O convite tem envio pelo compartilhamento nativo quando disponível, WhatsApp e cópia. O compartilhamento nativo é acionado em um segundo toque explícito, depois de a API preparar o link, preservando a exigência de gesto do navegador.
- O convite exige conta e aceite. A janela informa que participantes podem editar/conferir a lista; compras concluídas podem ser consultadas e reabertas conforme a permissão já existente. Prazo do convite e link ficam recolhidos. Nada é enviado automaticamente a contatos.
- Abrir lista compartilhada leva à tela que sincroniza as alterações dos participantes. Na composição da cesta, alterações posteriores continuam sujeitas ao salvamento existente; compartilhar novamente salva o novo estado. Não foi introduzido salvamento contínuo no rascunho.
- Limites de acesso, revogação, controle de revisão e marcações de produtos foram preservados.

## Varredura de texto e ações

- Lista e cesta: Compartilhar acessível junto das ações principais. Ações secundárias de listas salvas ficam em Mais.
- Comparação: cobertura em uma etiqueta e valor como Total ou Subtotal · lista incompleta, sem repetir a mesma advertência em vários parágrafos. A prévia continua dispensando salvamento e a economia não usa subtotais incompletos como totais completos.
- Mapa: título curto, loja/endereço no cartão, rota direta. Instruções repetidas foram retiradas. Uso de coordenadas pelo OSRM continua informado; explicação do mapa fica recolhida. Distância pelas ruas e em linha reta continuam diferenciadas.
- Comunidade/contribuição: retirada apresentação longa e mantida orientação curta de produto, loja e preço. Condições e validade continuam no formulário. Promoções e preços comuns continuam separados.
- Detalhes mantêm origem, validade, condições, endereço e cálculo do deslocamento. Nenhum preço, regra de comparação, câmera ou autenticação foi alterado nesta revisão.

## Validação

Testes frontend verificam salvar antes de convidar, preservação do ID/status, falha de salvamento sem gerar convite e propagação de falha de permissão. Teste de API verifica convite durante preparação e após conclusão, aceite explícito, isolamento antes do aceite e preservação da marcação/status concluído. Testes existentes de lista, família e comparação sem salvar foram executados. Build TypeScript/Vite e smoke HTTP fazem parte da validação; o compartilhamento nativo ainda depende da conferência em aparelho físico.
