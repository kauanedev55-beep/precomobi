# Cadastro de produtos, compra por peso e avisos de ofertas

## Uso cotidiano

1. Em Produtos, busque pelo nome ou código. Se não encontrar ou a API estiver indisponível, toque em **Cadastrar produto**. Também há esse acesso em Colaborar com um preço.
2. Informe nome/variedade, categoria, marca ou Sem marca, apresentação/embalagem, conteúdo líquido e código ou Sem código. Frutas, verduras e legumes têm atalhos próprios. Nenhum catálogo de hortifruti fictício foi inserido.
3. Escolha **Por unidade/embalagem** ou **Por quilo**. Uma embalagem de arroz de 5 kg continua sendo uma embalagem; seu preço não vira preço por kg. Maço sem peso declarado pode ser 1 unidade.
4. Na venda por peso o preço registrado é o de 1 kg; na lista informe 0,750 para 750 g. O total é preço por kg × peso informado. Ajuste ao peso real obtido na balança. Esta é uma estimativa, não uma balança nem uma cotação externa.
5. O cadastro do produto não cria preço nem lista automaticamente. Após cadastrar, escolha Adicionar à minha lista ou Informar preço no mercado. Listas permanecem temporárias até a escolha explícita de Salvar lista.
6. Colaborar é o formulário para enviar preços. Comunidade contém preços de todos, inclusive os seus. Minhas contribuições contém apenas os seus preços; não contém compras de outros usuários. No celular os registros usam cartões legíveis com ações visíveis.
7. Em **Avisos → Escolher meus avisos de ofertas**, opte por receber ou não. Escolha produtos das suas listas, mercados habituais ou ambos. Preferências privadas ficam salvas na conta e disponíveis em outros dispositivos.
8. Os avisos por lista respeitam a cidade atual. Mercados habituais usam as unidades selecionadas mesmo em outras cidades. Promoções próprias, encerradas e vencidas não geram avisos. Os preços promocionais permanecem separados do preço comum da comparação.

## Limites claros

- Avisos são atualizados a cada minuto com o aplicativo aberto e ao voltar para ele. Não há push com o app fechado, SMS, e-mail de oferta nem rastreamento de deslocamentos. Para push em segundo plano será necessário implementar Web Push, permissão explícita do navegador e um disparador confiável; não foi contratado serviço pago nem prometido disparo durante suspensão do Render gratuito.
- Nenhuma API de produtos cobre todo o varejo. O cadastro manual funciona sem consultar a API externa. O cliente ainda precisa ter conexão com o PreçoMobi; não é um modo offline.
- Campos novos dos produtos existentes ficam sem informação quando desconhecidos. Seus pesos, códigos, preços e listas não são reescritos. Não inferimos venda por kg só porque uma embalagem pesa 1 kg.
- A validação de novos códigos confere formato e dígito verificador. Cadastro duplicado retorna mensagem sem substituir o registro anterior.
- Migrações apenas acrescentam colunas, tabelas de preferências e unidades verificadas de mercados. Nenhuma tabela é removida e nenhum preço é inserido pelas migrações.
- Testes automatizados usam banco temporário. Não usamos contas ou preços fictícios no ambiente publicado. A tentativa de teste visual local no navegador remoto não alcançou o servidor local; a validação em aparelho físico ainda precisa ocorrer.

## Unidades verificadas em 05/11/2026

Manifesto com 49 unidades das redes solicitadas nas quatro cidades. As unidades já presentes são reconhecidas pelo nome/endereço e preservadas, inclusive quando editadas ou inativadas. Endereços são os publicados pelas fontes abaixo; não há coordenadas ou preços inventados. A lista oficial do Extrabom contém 26 filiais nas quatro cidades e todas constam no manifesto. A página oficial do Sempretem lista cinco unidades nessas cidades e todas constam no manifesto.

As fontes oficiais consultadas não confirmaram Assaí ou Atacadão em Cariacica, nem Casagrande em Vitória. Não foram criadas filiais nessas combinações. Para Carone/Casagrande, onde a página institucional não estava acessível, foram cruzados diretórios de lojas, cadastros públicos e fornecedores; unidades administrativas e endereços conflitantes não confirmados foram excluídos. A cobertura de todas as filiais não pode ser garantida quando a rede não disponibiliza uma lista acessível.

| Cidade | Unidade | Endereço publicado | Fonte |
|---|---|---|---|
| Cariacica | Extrabom Campo Grande | Av. Expedito Garcia, 947, Campo Grande | [Fonte](https://www.extrabom.com.br/lojas/101-campo-grande/) |
| Cariacica | Extrabom Cruzeiro do Sul | Rua do Vale, nº 2, Cruzeiro do Sul | [Fonte](https://www.extrabom.com.br/lojas/32-cruzeiro-do-sul/) |
| Cariacica | Extrabom Itacibá | Rua Manoel Joaquim dos Santos, N 02, Itacibá | [Fonte](https://www.extrabom.com.br/lojas/37-itaciba/) |
| Cariacica | Extrabom Jardim América | AV. Espírito Santo, N 21, Jardim América | [Fonte](https://www.extrabom.com.br/lojas/41-jardim-america/) |
| Serra | Extrabom Carapina Grande | Avenida Alpheu Ribeiro, 550, Carapina Grande | [Fonte](https://www.extrabom.com.br/lojas/74-carapina-grande/) |
| Serra | Extrabom Colina de Laranjeiras | Av. Braúna, N1168, Colina de Laranjeiras | [Fonte](https://www.extrabom.com.br/lojas/66-colina-de-laranjeiras/) |
| Serra | Extrabom Feu Rosa | Rua dos Cravos, N 102, Feu Rosa | [Fonte](https://www.extrabom.com.br/lojas/33-feu-rosa/) |
| Serra | Extrabom Jacaraípe | AV. Abido Saad, N 263, Jacaraípe | [Fonte](https://www.extrabom.com.br/lojas/40-jacaraipe/) |
| Serra | Extrabom Laranjeiras | Av. Eldes Scherrer Souza, S/N, Civit II, Serra - ES, Laranjeiras | [Fonte](https://www.extrabom.com.br/lojas/67-laranjeiras/) |
| Serra | Extrabom Laranjeiras Centro | Av. Central, 873, Laranjeiras | [Fonte](https://www.extrabom.com.br/lojas/42-laranjeiras-centro/) |
| Serra | Extrabom Porto Canoa | Av. Porto Canoa, 132, Porto Canoa | [Fonte](https://www.extrabom.com.br/lojas/52-porto-canoa/) |
| Serra | Extrabom Serra Centro | Av. Cassiano Castelo, N 82, Centro | [Fonte](https://www.extrabom.com.br/lojas/46-serra-centro/) |
| Serra | Extrabom Serra Dourada | Av. Goiania, S/N Qd. 01, Serra Dourada | [Fonte](https://www.extrabom.com.br/lojas/47-serra-dourada/) |
| Serra | Extrabom Top Life | Av. Brasil, s/n, São Diogo II | [Fonte](https://www.extrabom.com.br/lojas/43-top-life/) |
| Serra | Extrabom Valparaíso | Rua do Comércio, N 26, Valparaíso | [Fonte](https://www.extrabom.com.br/lojas/48-valparaiso/) |
| Vila Velha | Extrabom Barramares | Avenida Amaral Peixoto, 169 - LJ 04, Barramares | [Fonte](https://www.extrabom.com.br/lojas/83-barramares/) |
| Vila Velha | Extrabom Boulevard Shopping Vila Velha | Rod. do Sol, 5000, lojas 1061 a 1063, Jockey de Itaparica | [Fonte](https://www.extrabom.com.br/lojas/29-boulevard-shopping-vila-velha/) |
| Vila Velha | Extrabom Gaivotas | Av. Cel. Pedro Maia de Carvalho, 347, Praia das Gaivotas | [Fonte](https://www.extrabom.com.br/lojas/84-gaivotas/) |
| Vila Velha | Extrabom Glória | Av. Carlos Lindenberg, N 1955, Glória | [Fonte](https://www.extrabom.com.br/lojas/34-gloria/) |
| Vila Velha | Extrabom Itapoã | AV. FORTALEZA, 476, Itapoã | [Fonte](https://www.extrabom.com.br/lojas/38-itapoa/) |
| Vitória | Extrabom Goiabeiras | Av. Fernando Ferrari, N 2635, Segurança Do Lar | [Fonte](https://www.extrabom.com.br/lojas/35-goiabeiras/) |
| Vitória | Extrabom Grande Santo Antônio | Rod. Serafim Derenzi, 995, Inhanguetá | [Fonte](https://www.extrabom.com.br/lojas/90-grande-santo-antonio/) |
| Vitória | Extrabom Itararé | Rua Daniel Abreu Machado, N 151, Itararé | [Fonte](https://www.extrabom.com.br/lojas/39-itarare/) |
| Vitória | Extrabom Jardim Camburi | AV. José Maria Vivacqua Santos, 520, Jardim Camburi | [Fonte](https://www.extrabom.com.br/lojas/64-jardim-camburi/) |
| Vitória | Extrabom Praia do Suá | Rua Padre Antonio Ribeiro Pinto, N 156, Praia do Suá | [Fonte](https://www.extrabom.com.br/lojas/44-praia-do-sua/) |
| Vitória | Extrabom Vila Rubim | Rua Pedro Nolasco, N 150 - Pav. 1 E 2, Vila Rubim | [Fonte](https://www.extrabom.com.br/lojas/49-vila-rubim/) |
| Cariacica | Sempretem Alto Lage | Av. Mário Gurgel, 2728 - Alto Lage, Cariacica - ES, 29151-026 | [Fonte](https://superatacadosempretem.com.br/) |
| Vila Velha | Sempretem Barra do Jucu | Rod. do Sol, 3371 - Barra do Jucu, Vila Velha - ES, 29125-033 | [Fonte](https://superatacadosempretem.com.br/) |
| Serra | Sempretem Jardim Limoeiro | Av. Des. Mário da Silva Nunes, 545 - Jardim Limoeiro, Serra - ES, 29164-010 | [Fonte](https://superatacadosempretem.com.br/) |
| Vitória | Sempretem Jardim Camburi | R. Carlos Gomes Lucas, s/n - Jardim Camburi, Vitória - ES, 29090-050 | [Fonte](https://superatacadosempretem.com.br/) |
| Serra | Sempretem Jacaraípe | R. Rômulo Castelo, 754 - Irema, Serra - ES, 29172-620 | [Fonte](https://superatacadosempretem.com.br/) |
| Cariacica | Casagrande Maracanã | Av. Um | [Fonte](https://www.redecasagrande.com.br/institucional) |
| Cariacica | Casagrande Cruzeiro do Sul | Rua Estrela Matutina, 255 | [Fonte](https://www.redecasagrande.com.br/institucional) |
| Serra | Casagrande Jacaraípe | Av. Nossa Senhora dos Navegantes, 983, Quadra 23 | [Fonte](https://www.redecasagrande.com.br/institucional) |
| Serra | Casagrande Barcelona | Av. Norte Sul | [Fonte](https://www.redecasagrande.com.br/institucional) |
| Cariacica | Casagrande Alto Laje | Rodovia Governador José Henrique Sette, 1100 | [Fonte](https://br.todosnegocios.com/pt/casagrande-supermercados-alto-laje_1J-27-3038-8500) |
| Vila Velha | Casagrande Rio Marinho | Rua Guaraná, s/n | [Fonte](https://www.solutudo.com.br/empresas/es/vl-velha/mercados/supermercados-casagrande-ltda-23866386) |
| Vila Velha | Casagrande Coqueiral de Itaparica | Rua Itaiabaia, 100 | [Fonte](https://www.econodata.com.br/consulta-empresa/27473669001129-supermercados-casagrande-ltda) |
| Cariacica | Carone Campo Grande | Av. Expedito Garcia, 343 | [Fonte](https://jucai.com.br/lojas/espirito-santo/cariacica/campo-grande/) |
| Serra | Carone Jardim Limoeiro | Rodovia ES-010, 4320 | [Fonte](https://casadosdados.com.br/solucao/cnpj/drift-comercio-de-alimentos-sa-28129260000342) |
| Vitória | Carone Jardim Camburi | Av. Judith Leão Castello Ribeiro, 272 | [Fonte](https://www.solutudo.com.br/empresas/es/vitoria/mercados/supermercado-carone-132069) |
| Vitória | Carone Santa Lúcia | Av. Rio Branco, 77 | [Fonte](https://jucai.global/lojas/espirito-santo/vitoria/santa-lucia/) |
| Vitória | Carone Praia do Canto | Rua Joaquim Lírio, 76 | [Fonte](https://www.efirma.com.br/empresa/supermercado-carone-rio-janeiro/filiais) |
| Vila Velha | Carone Itapoã | Rua São Paulo, 2600 | [Fonte](https://www.waze.com/live-map/directions/br/es/supermercado-carone-itapoa?to=place.ChIJm6DtIG0WuAARj1-YlAUdK0o) |
| Vila Velha | Carone Praia da Costa | Av. Champagnat, 920 | [Fonte](https://www.benditoguia.com.br/empresa/supermercado-carone-praia-da-costa-vila-velha-es) |
| Serra | Atacadão Serra | Rodovia BR 101 Norte, s/n | [Fonte](https://www.atacadao.com.br/institucional/nossas-lojas?estado=ES) |
| Vitória | Atacadão Vitória | Av. Nossa Senhora da Penha, 2565 | [Fonte](https://www.atacadao.com.br/institucional/nossas-lojas?estado=ES) |
| Vila Velha | Atacadão Vila Velha | Rodovia Darly Santos, 160 | [Fonte](https://www.atacadao.com.br/institucional/nossas-lojas?estado=ES) |
| Vila Velha | Assaí Vila Velha | Av. Carlos Lindenberg, 5333 | [Fonte](https://www.assai.com.br/loja/assai-vila-velha) |
