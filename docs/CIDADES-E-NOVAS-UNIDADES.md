# Cidade da compra e novas unidades

No seletor Onde você quer comprar?, escolha Serra, Vitória ou Vila Velha.
Outras cidades do ES passam a aparecer quando houver mercados cadastrados.
Todas as cidades é uma escolha explícita; não é o padrão. A escolha é lembrada
neste navegador por conta. Não solicitamos GPS nem inferimos onde a pessoa mora.
No outro dispositivo, a cidade pode ser escolhida novamente.

A lista pode ser montada antes da escolha. Para salvar e comparar, é preciso
escolher a cidade. Abrir uma lista antiga também permite escolher ou mudar a
cidade sem apagar produtos. O filtro é aplicado no servidor antes de calcular
total, posição dos mercados, produtos em comum e economia. Não basta esconder
mercados depois do cálculo, pois isso distorceria as comparações parciais.

A mesma cidade filtra mercados, preços no catálogo e detalhe do produto,
comunidade, promoções, avisos e mercados disponíveis ao colaborar. Produtos sem
preço local continuam pesquisáveis e podem ser adicionados à lista. Históricos
pessoais de contribuição/promoção continuam exibindo todas as cidades.
O mapa genérico respeita o filtro; uma rota aberta por link para uma unidade
específica mantém esse destino e avisa se ele estiver fora da cidade escolhida.

Na comparação aparecem até três mercados com algum preço para a lista, com
opção de expandir os demais. Mercados sem qualquer preço para aqueles produtos
ficam agrupados, sem total inventado. Ausência de preço não significa falta de
estoque. A lista completa e os mesmos itens em comum continuam separados.

## Cadastro aditivo de 02/11/2026

| Cidade | Unidade | Endereço |
|---|---|---|
| Vila Velha | Perim Itapoã | Rua Deolindo Perim, 350, Itapoã |
| Vila Velha | Extrabom Itapoã | Av. Fortaleza, 476, Itapoã |
| Vila Velha | Carone Itaparica | Av. Santa Leopoldina, 2700, Praia de Itaparica |
| Vitória | Perim Mata da Praia | Av. Desembargador Dermeval Lyrio, 100, Mata da Praia |
| Vitória | Extrabom Jardim Camburi | Av. José Maria Vivacqua Santos, 520, Jardim Camburi |
| Vitória | Carone Jardim da Penha | Av. Hugo Viola, 615, Jardim da Penha |

Endereços conferidos nas fontes oficiais:

- https://www.superperim.com.br/nossaslojas
- https://www.extrabom.com.br/lojas/38-itapoa/
- https://www.extrabom.com.br/lojas/64-jardim-camburi/
- https://www.carone.com.br/checkout

A migração greater-vitoria-markets-2026-11-02 roda uma vez em produção,
transacionalmente. Não altera nem reativa registros preexistentes com o mesmo
nome ou endereço na cidade, não cria preços nem coordenadas e não apaga nada.
O Google Maps usa o endereço até que coordenadas reais sejam cadastradas.
Os preços precisam ser coletados e informados pela comunidade para as novas
unidades participarem da comparação com valores.

## Validação

Testes isolados verificam filtro com ou sem acento, estado ES e lojas ativas,
recalculo dos itens em comum por cidade, preços do catálogo/detalhe, filtro antes
da paginação em preços e promoções, privacidade das listas e migração repetida
sem duplicação nem preços fictícios. Build TypeScript/Vite validado.
Testes manuais com câmera em celular e avaliação com usuários seguem necessários.
