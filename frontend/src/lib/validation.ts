const labels:Record<string,string>={name:"Nome",category:"Categoria",brand:"Marca",ean:"Código de barras",packaging:"Embalagem",quantity_value:"Conteúdo da embalagem",quantity_unit:"Medida do conteúdo",sale_unit:"Forma de venda",description:"Detalhes adicionais",market_ids:"Mercados habituais"};
export function validationMessage(detail:unknown): string {
  if(typeof detail === "string") return detail;
  if(Array.isArray(detail)) {
    const first=detail.find(i=>i && typeof i === "object" && typeof i.msg === "string");
    if(first) {
      if(first.type === "value_error") return first.msg.replace(/^Value error, /,"");
      const field=Array.isArray(first.loc) ? String(first.loc.at(-1)) : "";
      return `${labels[field] || "Dados informados"}: confira se o campo foi preenchido corretamente e respeita o tamanho ou valor permitido.`;
    }
    return "Verifique os dados informados e tente novamente.";
  }
  return "A API retornou um erro. Tente novamente.";
}
