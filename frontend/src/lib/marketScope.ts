type Market={id:number;name:string;city:string;state:string};

const plain=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");
const networks:[RegExp,string][]=[
  [/^carone\b/,"Carone"],[/^extra\s*bom\b/,"Extrabom"],[/^sempre\s*tem\b/,"Sempretem"],
  [/^(?:supermercados?\s+)?bh\b/,"Supermercados BH"],[/^casa\s*grande\b/,"Casagrande"],
  [/^atacadao\b/,"Atacadão"],[/^assai\b/,"Assaí"],[/^perim\b/,"Perim"],
];
export function marketNetwork(name:string):string {
  return networks.find(([pattern])=>pattern.test(plain(name)))?.[1] ?? name.trim();
}
export function cityMarkets<T extends Market>(markets:T[],city:string):T[] {
  return markets.filter(m=>Boolean(city)&&m.state.trim().toUpperCase()==="ES"&&(city==="*"||plain(m.city)===plain(city)));
}
export function networkChoices(markets:Market[]):string[] {
  return [...new Set(markets.map(m=>marketNetwork(m.name)))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
}
export function selectedMarketIds(markets:Market[],network:string,store:string):number[] {
  return markets.filter(m=>(!network||marketNetwork(m.name)===network)&&(!store||String(m.id)===store)).map(m=>m.id);
}
export function offersForMarkets<T extends {market:Market;related_offers?:T[]}>(groups:T[],marketIds:number[]):T[] {
  const allowed=new Set(marketIds);
  return groups.flatMap(group=>{
    const members=[group,...(group.related_offers??[])].filter(o=>allowed.has(o.market.id));
    return members.length ? [{...members[0],related_offers:members.slice(1).map(member=>({...member,related_offers:[]}))}] : [];
  });
}
// An explicit route has exactly one destination. The page supplies city stores in general mode.
export function mapDestinations<T extends Market>(markets:T[],selectedId:number|null):T[] {
  return selectedId===null ? [] : markets.filter(m=>m.id===selectedId);
}

// Public retailer entry points; the retailer still determines local availability.
export function marketWebsite(network:string):string|null {
  const sites:Record<string,string>={
    Carone:"https://www.carone.com.br/",
    Extrabom:"https://www.extrabom.com.br/",
    Sempretem:"https://superatacadosempretem.com.br/",
    "Supermercados BH":"https://www.supermercadosbh.com.br/folhetos",
    Casagrande:"https://www.redecasagrande.com.br/",
    "Atacadão":"https://www.atacadao.com.br/institucional/nossas-lojas",
    "Assaí":"https://www.assai.com.br/ofertas",
    Perim:"https://www.superperim.com.br/",
  };
  return sites[network]??null;
}
