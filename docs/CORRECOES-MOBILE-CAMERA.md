# Revisão mobile — 17/11/2026

- Produtos volta a abrir vazio para busca, sem filtro implícito por preço. Ofertas permanecem em Promoções. Ler código e Cadastrar produto usam o mesmo padrão de botão; filtros ficam em uma seção recolhida.
- A consulta pública de “leite” em Serra retornou 79 apresentações sem restrição por preço e apenas duas com a restrição antiga. Esse filtro ocultava produtos e podia fazer instalações novas parecerem diferentes do computador.
- Cidade ocupa uma linha. Promoções tem cabeçalho e filtros compactos, sem mensagens repetidas. Fonte, validade, condições de clube e avisos de alteração continuam acessíveis. O ícone de informação usa SVG centralizado, sem depender do glifo da fonte do aparelho.
- Minha lista e a cesta têm Comparar preços como ação direta para /comparacao/atual. A API de prévia continua calculando sem persistir lista ou itens. Nome e salvamento ficam em Salvar lista (opcional), sem impedir a comparação.
- A comparação exibe total para listas completas e subtotal para listas parciais, sempre com a contagem de itens com preço e um aviso curto dos preços faltantes. Endereço, produtos, origem e validade ficam nos detalhes. As regras de cálculo não mudaram.
- A abertura da câmera foi separada do decodificador. O vídeo recebe muted/defaultMuted, playsInline e os atributos WebKit antes do stream. A leitura começa quando há imagem real. Se o Safari bloquear play(), Ativar câmera chama play() diretamente no toque, sem pedir outra permissão. Resolução incompatível tem fallback; fechar o leitor libera seus recursos, inclusive quando a permissão chega atrasada. Inspeção opcional de foco não interrompe o leitor.
- O processamento dos códigos continua local no navegador, sem enviar imagens da câmera ao servidor. Entrada manual de código continua disponível.

Validação: testes automatizados cobrem fluxo de câmera, gesto de retomada, fallback, espera por imagem e fechamento concorrente; testes existentes verificam comparação sem persistência. A compilação TypeScript/Vite foi conferida. O navegador de teste disponível não acessou o servidor local; não foi realizado teste físico de câmera no iPhone. O retorno da usuária no aparelho permanece necessário para confirmar esse comportamento específico.

## Complemento: app instalado, fotos e conferência

- Leitor usa exclusivamente câmera ao vivo ou digitação do EAN/QR. A captura de fotografia foi retirada do leitor a pedido da usuária: foto pertence ao cadastro do produto. O botão Ativar câmera inicia getUserMedia diretamente no toque, com vídeo já montado e visível. Os atributos inline são aplicados antes da captura; reprodução bloqueada permite religar o mesmo stream no próximo toque, sem nova solicitação de permissão. Sair do app, ocultar a página ou digitar o código encerra a captura, evitando manter vídeo ativo atrás do teclado. Track encerrada pelo sistema interrompe os decodificadores e oferece nova tentativa. HTTPS e ZXing continuam; BarcodeDetector é opcional. A causa exata no aparelho ainda não foi confirmada.
- Cadastro manual permite foto opcional pela câmera ou galeria. Criador e administrador podem incluir/trocar a foto depois na ficha. Fotos são redimensionadas no navegador e novamente validadas no servidor, sem EXIF; um JPEG de até 128 KiB por produto fica na tabela privada product_photos do banco existente. A API serve apenas a imagem de produtos ativos. Há limite diário de 50 produtos com fotos por usuário comum. Não há serviço de armazenamento pago adicional.
- Cesta e edição da lista mostram produtos e quantidades, sem “Já peguei”. A conferência permanece na visualização da lista salva/compartilhada, sincronizada entre proprietário e participantes pelos endpoints existentes. Marcas já registradas são preservadas.


Validação desta revisão: 45 testes do frontend e compilação TypeScript/Vite aprovados. Inclui solicitação síncrona de captura, atributos antes da solicitação, retomada com reanexação do stream, track encerrada, ocultação da página e decodificação real de pixels de EAN pelo mesmo ZXing usado no vídeo, sem BarcodeDetector. O teste integrado com Chromium e câmera simulada não iniciou devido a bloqueio de socket do processo no ambiente. Não representa validação física no iPhone; esse teste continua pendente.

## Retorno do iPhone e Android instalado

Após a usuária confirmar que a câmera ainda fica em abertura no iPhone e que o Android é aberto pelo ícone instalado:

- Captura traseira é solicitada sem resolução predefinida; restrição incompatível permite câmera padrão. O início da decodificação passa a depender dos pixels de vídeo, em paralelo com play(), para não ficar bloqueado apenas por uma promessa de reprodução pendente. Captura, imagem e leitura têm etapas identificadas em detalhes recolhidos de erro.
- O leitor usa portal no body, em tela inteira nos celulares, com o restante da aplicação inerte enquanto aberto. Fechar restaura foco e rolagem. O vídeo tem altura explícita e não fica dentro de cartões ou elementos que possam recortá-lo. A fotografia permanece exclusivamente no cadastro/ficha.
- Em caso de falha no app instalado do iPhone, há um link opcional Usar leitor no navegador. A busca reconhece /produtos?ler=1 para abrir o leitor após acesso à página. A abertura em navegador é uma contingência, não uma confirmação de correção da câmera do PWA; sessão do navegador pode precisar de login.
- Interface de telefone usa títulos de produto de 18 px, botões de pelo menos 50 px, controles de quantidade de 44 px ou mais, imagens de 96 px e abas inferiores de 14 px nas telas a partir de 360 px. Resultados ocupam a largura disponível, com quantidade e Adicionar próximos; abaixo de 360 px os controles ficam em linhas separadas. A versão instalada dispensa o rodapé institucional. Desktop permanece com suas regras anteriores.

Validação: 47 testes frontend, incluindo pixels disponíveis com play() indefinidamente pendente e ausência de pixels apesar de play() resolvido. A confirmação física do leitor no iPhone e da escala visual no Android permanece pendente. A inspeção da página pública em navegador desktop não substitui teste mobile.
