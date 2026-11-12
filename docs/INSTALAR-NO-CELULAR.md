# Instalar o PreçoMobi no celular

A instalação acontece pelo próprio site, sem publicar nas lojas. Abra https://precomobi-1.onrender.com/instalar no navegador do celular. O link também está no rodapé e em Meu perfil. Não é obrigatório instalar para continuar usando o site.

## Android

Abra no Chrome. Toque em Instalar PreçoMobi quando o botão estiver disponível, ou use o menu de três pontos > Instalar aplicativo / Adicionar à tela inicial. Confirme e procure o ícone na tela inicial ou na lista de aplicativos. O navegador decide quando disponibiliza a instalação; não mostramos botão que promete abrir um diálogo indisponível.

## iPhone

Abra no Safari > Compartilhar > Adicionar à Tela de Início > Adicionar. Se houver a opção Abrir como App, deixe ativada. Procure o ícone PreçoMobi. Pode ser necessário entrar novamente na conta ao abrir o app instalado pela primeira vez. Listas salvas na conta permanecem disponíveis após entrar; rascunhos locais podem não migrar do navegador para a janela instalada.

## Funcionamento

O manifesto público `/manifest.json` usa ID e escopo /, abertura em /lista, display standalone e ícones PNG 192/512, um ícone maskable com margem segura e apple-touch-icon de 180 px. A marca existente foi adaptada, sem mudar a identidade. A instalação não desativa a verificação de e-mail nem muda permissões.

Um service worker é registrado somente no build de produção e em contexto seguro. Guarda exclusivamente a página pública de falta de conexão e um ícone. Não armazena HTML da aplicação, respostas de autenticação, API, preços ou listas. Navegações usam a rede com no-store; se a conexão falhar, mostram uma tela sem dados pessoais. A página de fallback nunca é gravada como uma lista nem apresentada como resultado de comparação. Requisições da API e de outros domínios não são interceptadas.

Para consultar preços, comparar, compartilhar ou salvar listas é necessária internet. Isso não implementa edição offline com sincronização. Notificações push e coleta diária também não fazem parte desta entrega.

Atualizações da interface vêm pelo site; fechar e abrir carrega novamente a página, sujeita à disponibilidade da rede e à propagação do deploy. O registro verifica atualizações quando a página volta a ficar visível. Não há recarregamento forçado no meio das compras.

## Verificação

23 testes frontend, verificação TypeScript e build de produção. Os três novos testes verificam os tamanhos reais dos ícones, o escopo do manifesto, o isolamento de tráfego privado/API e o fallback sem cache de dados pessoais. A verificação de publicação confere manifesto, service worker, página offline, ícones e rota de instalação. A checagem visual usa o navegador disponível; instalação em Android/iPhone físico deve ser concluída pelo usuário no aparelho, sem afirmar que esse teste físico já ocorreu.

## Escolha depois do cadastro

Após o cadastro bem-sucedido, a rota `/comecar` pergunta Como você quer continuar?, com somente dois botões: Continuar pelo site (login) ou Instalar no celular (instruções em `/instalar`). O aviso de criação de conta só aparece quando a navegação vem do cadastro; abrir a rota diretamente não afirma que uma conta foi criada. A confirmação de e-mail continua obrigatória. Não há login automático por instalar. O destino de retorno, inclusive convite de lista familiar, é repassado na navegação ao login. Nenhuma senha ou e-mail é colocado na URL da escolha.

A escolha não aparece em cada login. Na janela instalada, o segundo caminho é ocultado. A instalação também está no menu público e em Mais opções do menu da conta, sem criar uma quinta aba na navegação inferior nem modificar as telas de compras. A página com os passos de instalação é aberta ao escolher instalar.
