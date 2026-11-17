"""Coleta assistida de fontes oficiais. Não publica nem inventa preços."""
from __future__ import annotations
import argparse
import hashlib
import html
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import URLError, HTTPError

SOURCES = [
    {"name":"Carone", "prefix":"Carone", "url":"https://linktr.ee/caroneonline", "publisher":"carone"},
    {"name":"Sempretem", "prefix":"Sempretem", "url":"https://superatacadosempretem.com.br/", "publisher":"sempretem"},
    {"name":"Extrabom Colina de Laranjeiras", "prefix":"Extrabom", "city":"Serra", "store_name":"Extrabom Colina de Laranjeiras", "url":"https://www.extrabom.com.br/lojas/66-colina-de-laranjeiras/folheto/"},
    {"name":"Supermercados BH", "prefix":"Supermercados BH", "url":"https://www.supermercadosbh.com.br/folhetos"},
    {"name":"Casagrande", "prefix":"Casagrande", "url":"https://www.redecasagrande.com.br/"},
    {"name":"Perim", "prefix":"Perim", "url":"https://www.superperim.com.br/"},
    {"name":"Atacadão", "prefix":"Atacadão", "url":"https://www.atacadao.com.br/institucional/nossas-lojas"},
    {"name":"Assaí", "prefix":"Assaí", "url":"https://www.assai.com.br/ofertas"},
]
ALLOWED = {"linktr.ee","www.flipsnack.com","flipsnack.com","superatacadosempretem.com.br","www.superatacadosempretem.com.br","www.extrabom.com.br","extrabom.com.br","www.supermercadosbh.com.br","supermercadosbh.com.br","precomobi.onrender.com","precomobi-1.onrender.com"}
ALLOWED.update({"www.redecasagrande.com.br","redecasagrande.com.br","www.superperim.com.br","superperim.com.br","www.atacadao.com.br","atacadao.com.br","www.assai.com.br","assai.com.br"})
MAX_BYTES=4_000_000

def safe_url(url):
    try:
        p=urlsplit(url)
        return p.scheme=="https" and not p.username and not p.password and p.hostname in ALLOWED and p.port in (None,443)
    except ValueError:return False

class OfficialRedirect(HTTPRedirectHandler):
    def redirect_request(self,request,fp,code,msg,headers,newurl):
        if not safe_url(newurl):raise ValueError("Redirecionamento fora das fontes permitidas")
        return super().redirect_request(request,fp,code,msg,headers,newurl)

def fetch(url):
    if not safe_url(url): raise ValueError("Endereço fora das fontes permitidas")
    request=Request(url,headers={"User-Agent":"PrecoMobi-Coletor/1.0 (+https://precomobi-1.onrender.com)","Accept":"text/html,application/json"})
    with build_opener(OfficialRedirect()).open(request,timeout=20) as response:
        if not safe_url(response.geturl()): raise ValueError("Redirecionamento fora das fontes permitidas")
        raw=response.read(MAX_BYTES+1)
        if len(raw)>MAX_BYTES: raise ValueError("Resposta maior que o limite")
        return raw.decode(response.headers.get_content_charset() or "utf-8",errors="replace")

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.images=[]; self.title=""; self.in_title=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="a" and a.get("href"):self.links.append(a["href"])
        if tag=="img" and a.get("src"):self.images.append(a["src"])
        if tag=="meta" and a.get("property")=="og:image" and a.get("content"):self.images.append(a["content"])
        if tag=="title":self.in_title=True
    def handle_endtag(self,tag):
        if tag=="title":self.in_title=False
    def handle_data(self,data):
        if self.in_title:self.title+=data

def discover(source,body):
    parser=Links();parser.feed(body)
    links=[]
    for value in parser.links:
        url=urljoin(source["url"],html.unescape(value));parts=urlsplit(url)
        if parts.hostname in ("www.flipsnack.com","flipsnack.com") and source.get("publisher"):
            if parts.path.startswith("/"+source["publisher"]+"/") and ("esp-rito-santo" in parts.path or "espirito-santo" in parts.path):
                links.append(url)
        elif parts.hostname in ("www.supermercadosbh.com.br","supermercadosbh.com.br") and parts.path.lower().endswith(".pdf"):
            links.append(url)
    images=[]
    for value in parser.images:
        url=urljoin(source["url"],html.unescape(value))
        # Some store pages expose root-relative uploads without a leading slash.
        if value.startswith("uploads/"):url=urljoin(source["url"],"/"+value)
        if safe_url(url) and "/uploads/ofertas/" in url:images.append(url)
    return {"title":parser.title.strip()[:300],"leaflets":sorted(set(links)),"images":sorted(set(images))}

def scoped_markets(source,markets):
    return [{"id":m["id"],"name":m["name"],"city":m["city"]} for m in markets
            if m.get("state")=="ES" and m.get("name","").casefold().startswith(source["prefix"].casefold())
            and (not source.get("city") or m.get("city")==source["city"])
            and (not source.get("store_name") or m.get("name")==source["store_name"])]

def collect(output,fetcher=fetch,now=None,verify=False):
    now=now or datetime.now(timezone.utc).isoformat()
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    state_path=output/"estado.json"
    try:previous=json.loads(state_path.read_text(encoding="utf-8"))
    except (OSError,ValueError):previous={}
    report={"version":1,"checked_at":now,"mode":"coleta_assistida","published_prices":0,"sources":[],"warnings":[]}
    try:markets=json.loads(fetcher("https://precomobi.onrender.com/api/markets"))
    except (OSError,ValueError,URLError,HTTPError):
        markets=[];report["warnings"].append("Não foi possível consultar as lojas do app. Nenhuma abrangência confirmada.")
    if not isinstance(markets,list):markets=[];report["warnings"].append("Cadastro de lojas retornou formato inesperado.")
    state=dict(previous)
    for source in SOURCES:
        row={"name":source["name"],"url":source["url"],"checked_at":now,"markets_to_review":scoped_markets(source,markets)}
        try:
            data=discover(source,fetcher(source["url"]))
            fingerprint=hashlib.sha256(json.dumps([data["leaflets"],data["images"]],ensure_ascii=False).encode()).hexdigest()
            found=bool(data["leaflets"] or data["images"])
            row.update(data)
            row["status"]="novo_ou_alterado" if found and previous.get(source["url"])!=fingerprint else "sem_mudanca" if found else "revisao_manual"
            row["note"]="Confira validade, produto, unidade e abrangência antes de publicar. Lojas listadas são candidatas, não aplicação automática."
            if found:state[source["url"]]=fingerprint
            # Inspect the linked leaflet metadata, without interpreting an image as a price.
            row["previews"]=[]
            for url in data["leaflets"][:2]:
                try:
                    p=Links();p.feed(fetcher(url))
                    row["previews"].append({"url":url,"images":p.images[:3]})
                except (OSError,ValueError,URLError,HTTPError):pass
        except (OSError,ValueError,URLError,HTTPError) as exc:
            row.update(status="falha",note="Consulta não concluída: "+type(exc).__name__)
        report["sources"].append(row)
    if verify:
        try:
            products=json.loads(fetcher("https://precomobi.onrender.com/api/products?q=carr%C3%A9&city=Serra&preferred=true&external=false"))
            cut=next((p for p in products if p.get("catalog_source_url")=="https://www.carone.com.br/carre-suino-kg-14250/p"),None)
            if cut:
                detail=json.loads(fetcher("https://precomobi.onrender.com/api/products/"+str(cut["id"])+"?city=Serra"))
                report["public_price_check"]={"product_id":cut["id"],"product_name":cut["name"],"prices":[{k:r.get(k) for k in ("market_id","market_name","price","reported_at","expires_at","source_type","source_url")} for r in detail.get("prices",[]) if r.get("price") is not None]}
            else:report["public_price_check"]={"status":"produto_nao_encontrado"}
        except (OSError,ValueError,URLError,HTTPError,TypeError):
            report["public_price_check"]={"status":"falha_na_consulta"}
    (output/"consulta.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding="utf-8")
    sections=[]
    for row in report["sources"]:
        links="".join('<li><a target="_blank" rel="noreferrer" href="'+html.escape(u,quote=True)+'">'+html.escape(u)+'</a></li>' for u in [row["url"],*row.get("leaflets",[]),*row.get("images",[])])
        stores=", ".join(m["name"]+" ("+m["city"]+")" for m in row["markets_to_review"]) or "Lojas não confirmadas"
        sections.append("<section><h2>"+html.escape(row["name"])+"</h2><p>"+html.escape(row["status"])+"</p><p>"+html.escape(stores)+"</p><ul>"+links+"</ul></section>")
    page='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Consulta diária PreçoMobi</title><style>body{font:17px/1.6 system-ui;max-width:900px;margin:32px auto;padding:16px;background:#f4efe6;color:#243b5a}section{background:white;padding:20px;border-radius:16px;margin:16px 0}a{overflow-wrap:anywhere}li{margin:12px 0}</style><h1>Consulta diária PreçoMobi</h1><p>Consultado em '+html.escape(now)+'</p><p>Coleta assistida: os preços ainda precisam de revisão. Nenhum valor foi publicado automaticamente.</p>'+''.join(sections)+'</html>'
    (output/"consulta.html").write_text(page,encoding="utf-8")
    return report

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",default="atualizacoes")
    parser.add_argument("--abrir",action="store_true")
    parser.add_argument("--verificar-precos",action="store_true",help="Consulta também as cotações públicas do corte demonstrado.")
    args=parser.parse_args()
    report=collect(args.output,verify=args.verificar_precos)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if args.abrir:
        import webbrowser
        webbrowser.open((Path(args.output)/"consulta.html").resolve().as_uri())
    return 1 if all(row["status"]=="falha" for row in report["sources"]) else 0

if __name__=="__main__":raise SystemExit(main())
