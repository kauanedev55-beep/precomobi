"""Converte preços revisados para IDs reais do app. Não publica."""
import argparse,json
from pathlib import Path
from datetime import datetime,timezone
from decimal import Decimal,InvalidOperation

def prepare(entries,products,markets,now=None):
    now=now or datetime.now(timezone.utc)
    output=[]
    for entry in entries:
        start=datetime.fromisoformat(entry["valid_from"]);end=datetime.fromisoformat(entry["valid_until"])
        if not start.tzinfo or not end.tzinfo or not start<=now<end:raise ValueError("Há data sem fuso, futura ou vencida.")
        for field in ("regular_price","club_price"):
            if entry.get(field) is not None:
                price=Decimal(str(entry[field]))
                if not price.is_finite() or price<=0 or price.as_tuple().exponent < -2:raise ValueError("Preço inválido.")
        product=next((p for p in products if p.get("catalog_source_url")==entry["product_source_url"]),None)
        if not product:raise ValueError("Produto não encontrado: "+entry["product_source_url"])
        if product["sale_unit"]!=entry["sale_unit"]:raise ValueError("Unidade diferente do cadastro.")
        selected=[m["id"] for m in markets if m.get("state")=="ES" and m.get("name","").startswith(entry["market_prefix"])
                  and m.get("name") not in entry.get("excluded_markets",[]) and (not entry.get("cities") or m.get("city") in entry["cities"])]
        if not selected:raise ValueError("Nenhuma loja cadastrada corresponde à revisão.")
        row={key:entry.get(key) for key in ("sale_unit","regular_price","club_price","club_name","conditions","valid_from","valid_until","source_url")}
        output.append({**row,"product_id":product["id"],"market_ids":selected,"channel":"physical_flyer"})
    return {"entries":output,"reviewed":False}

def main():
    from coletor_precos import fetch
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arquivo",help="Arquivo JSON de preços revisados, no formato dos manifestos.")
    parser.add_argument("--output",default="atualizacoes/importar-precos.json")
    args=parser.parse_args()
    try:
        entries=json.loads(Path(args.arquivo).read_text(encoding="utf-8"))
        if not isinstance(entries,list) or not entries or len(entries)>200:raise ValueError("Use uma lista com 1 a 200 entradas.")
        products=json.loads(fetch("https://precomobi.onrender.com/api/products?external=false"))
        markets=json.loads(fetch("https://precomobi.onrender.com/api/markets"))
        result=prepare(entries,products,markets)
        path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    except (ValueError,KeyError,OSError,InvalidOperation) as exc:
        parser.exit(1,"Não foi preparado nenhum novo arquivo: "+str(exc)+"\n")
    print("Arquivo preparado: "+str(path)+". Confira todas as lojas e os preços na área administrativa antes de publicar.")
    return 0

if __name__=="__main__":raise SystemExit(main())
