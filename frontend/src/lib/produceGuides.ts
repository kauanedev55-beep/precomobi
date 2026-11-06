type ProduceProduct = {name: string; catalog_source_url?: string | null};
export type ProduceGuide = {title: string; badge: string; hint: string};
const guides: Record<string,ProduceGuide> = {
  "https://www.extrabom.com.br/p/batata-inglesa-unidade/1490/": {
    title:"Batata inglesa",badge:"Casca clara",hint:"Compare a casca clara da foto. É diferente da batata-doce."},
  "https://www.extrabom.com.br/p/batata-doce-unidade/1475/": {
    title:"Batata-doce · casca rosada",badge:"Rosada / avermelhada na foto",hint:"Esta foto mostra a casca rosada ou avermelhada. Confira a variedade na etiqueta."},
  "https://www.rappi.com.br/p/batata-doce-roxa-251429": {
    title:"Batata-doce de casca roxa",badge:"Roxa por fora",hint:"Se você quer polpa clara, confira essa informação na etiqueta. A foto não mostra o interior."},
  "https://www.extrabom.com.br/p/banana-prata-penca/1421/": {
    title:"Banana prata",badge:"Prata",hint:"Costuma ser menor, mais reta e com quinas marcadas. Confira o nome na etiqueta."},
  "https://www.extrabom.com.br/p/banana-nanica-penca/1407/": {
    title:"Banana nanica",badge:"Nanica / banana-d’água",hint:"Costuma ser mais comprida e curva. Também pode ser chamada banana-d’água."},
  "https://www.extrabom.com.br/p/banana-da-terra-penca/1388/": {
    title:"Banana-da-terra",badge:"Da terra",hint:"Em geral, é maior e mais comprida. Muito usada cozida ou frita."},
};
export function produceGuide(product: ProduceProduct): ProduceGuide | null {
  return product.catalog_source_url ? guides[product.catalog_source_url] ?? null : null;
}
export function productDisplayName(product: ProduceProduct): string {
  return produceGuide(product)?.title ?? product.name;
}
export function catalogCredit(source?: string | null): string {
  if(!source) return "";
  try {
    const host=new URL(source).hostname;
    if(host==="www.extrabom.com.br" || host==="extrabom.com.br") return "Extrabom";
    if(host==="www.carone.com.br" || host==="carone.com.br" || host==="fs.carone.com.br") return "Carone";
    if(host==="www.rappi.com.br" && source.includes("/batata-doce-roxa-251429")) return "Assaí via Rappi";
  }catch { /* Unknown references keep a neutral label. */ }
  return "catálogo de origem";
}
