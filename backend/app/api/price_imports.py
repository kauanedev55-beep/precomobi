"""Importação administrativa revisada, sem consultas externas nem alteração de tabelas."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from app.api.deps import get_admin_user
from app.db.session import get_db
from app.models import Product, Market, PriceReport, User
from app.models.offers import Offer

router=APIRouter(prefix="/admin/price-import",tags=["admin"])
HOSTS={"www.carone.com.br":"Carone","carone.com.br":"Carone","www.extrabom.com.br":"Extrabom","extrabom.com.br":"Extrabom","superatacadosempretem.com.br":"Sempretem","www.superatacadosempretem.com.br":"Sempretem","www.supermercadosbh.com.br":"Supermercados BH","supermercadosbh.com.br":"Supermercados BH","stgrsbhprd.blob.core.windows.net":"Supermercados BH"}

HOSTS.update({"www.redecasagrande.com.br":"Casagrande","redecasagrande.com.br":"Casagrande","www.superperim.com.br":"Perim","superperim.com.br":"Perim","www.assai.com.br":"Assaí","assai.com.br":"Assaí","www.atacadao.com.br":"Atacadão","atacadao.com.br":"Atacadão","superbh.app":"Supermercados BH"})

class ImportEntry(BaseModel):
    model_config=ConfigDict(extra="forbid",str_strip_whitespace=True)
    product_id:int=Field(gt=0)
    market_ids:list[int]=Field(min_length=1,max_length=60)
    sale_unit:Literal["unit","kg"]
    regular_price:Decimal|None=Field(default=None,gt=0,max_digits=10,decimal_places=2)
    club_price:Decimal|None=Field(default=None,gt=0,max_digits=10,decimal_places=2)
    club_name:str|None=Field(default=None,max_length=80)
    conditions:str=Field(min_length=3,max_length=300)
    valid_from:datetime
    valid_until:datetime
    source_url:str=Field(min_length=8,max_length=500)
    channel:Literal["physical_flyer"]="physical_flyer"

    @field_validator("market_ids")
    @classmethod
    def stores(cls,value):
        if any(i<1 for i in value) or len(value)!=len(set(value)):raise ValueError("Selecione lojas válidas, sem repetição.")
        return value

    @field_validator("source_url")
    @classmethod
    def source(cls,value):
        try:
            p=urlsplit(value)
            allowed=p.hostname in HOSTS or (p.hostname in {"www.flipsnack.com","flipsnack.com"} and (p.path.startswith("/carone/") or p.path.startswith("/sempretem/")))
            if p.scheme!="https" or p.username or p.password or p.port not in (None,443) or not allowed:raise ValueError()
        except ValueError:raise ValueError("Use um link HTTPS de uma das fontes oficiais suportadas.")
        return value

    @model_validator(mode="after")
    def dates_and_prices(self):
        if any(d.tzinfo is None or d.utcoffset() is None for d in (self.valid_from,self.valid_until)):raise ValueError("Datas precisam indicar o fuso horário.")
        if self.valid_until<=self.valid_from:raise ValueError("A validade final deve ser posterior à inicial.")
        if self.regular_price is None and self.club_price is None:raise ValueError("Informe ao menos um preço.")
        if self.club_price is not None and not self.club_name:raise ValueError("Informe o clube exigido.")
        if self.club_price is not None and self.regular_price is not None and self.club_price>self.regular_price:raise ValueError("O preço de clube não pode ser maior que o preço sem clube.")
        return self

class ImportBatch(BaseModel):
    model_config=ConfigDict(extra="forbid")
    entries:list[ImportEntry]=Field(min_length=1,max_length=200)
    reviewed:bool=False

def chain_for(url):
    p=urlsplit(url)
    if p.hostname in {"www.flipsnack.com","flipsnack.com"}:return "Carone" if p.path.startswith("/carone/") else "Sempretem"
    return HOSTS[p.hostname]

def plan(db,batch,now):
    if sum(len(e.market_ids) for e in batch.entries)>1000:raise HTTPException(422,"Limite de 1.000 combinações de produto e loja por importação.")
    rows=[];seen=set()
    for entry in batch.entries:
        if not entry.valid_from<=now<entry.valid_until:raise HTTPException(422,"Há uma oferta futura ou vencida. Confira a validade do arquivo.")
        if (entry.valid_until-now).days>90:raise HTTPException(422,"Validade acima de 90 dias exige revisão do arquivo.")
        product=db.get(Product,entry.product_id)
        if not product or not product.is_active:raise HTTPException(422,f"Produto {entry.product_id} não está ativo no catálogo.")
        if product.sale_unit!=entry.sale_unit:raise HTTPException(422,f"Unidade diferente do cadastro de {product.name}.")
        prefix=chain_for(entry.source_url)
        for market_id in entry.market_ids:
            market=db.get(Market,market_id)
            if not market or not market.is_active or market.state!="ES" or not market.name.casefold().startswith(prefix.casefold()):
                raise HTTPException(422,f"Loja {market_id} não pertence à rede/região desta fonte. Nenhum dado foi publicado.")
            identity=(product.id,market.id)
            if identity in seen:raise HTTPException(422,"Há mais de um preço para o mesmo produto e loja no arquivo.")
            seen.add(identity)
            rows.append((entry,product,market))
    return rows

def view(rows):
    return [{"product_id":p.id,"product_name":p.name,"market_id":m.id,"market_name":m.name,"city":m.city,"sale_unit":e.sale_unit,
             "regular_price":str(e.regular_price) if e.regular_price is not None else None,"club_price":str(e.club_price) if e.club_price is not None else None,
             "club_name":e.club_name,"valid_from":e.valid_from,"valid_until":e.valid_until,"conditions":e.conditions,"source_url":e.source_url} for e,p,m in rows]

class SourceBatch(BaseModel):
    model_config=ConfigDict(extra="forbid")
    entries:list[dict]=Field(min_length=1,max_length=200)

@router.post("/prepare")
def prepare_source(batch:SourceBatch,db:Session=Depends(get_db),admin:User=Depends(get_admin_user)):
    prepared=[]
    metadata={"product_source_url","market_prefix","cities","excluded_markets","product_name","source_label","evidence_image"}
    allowed=(set(ImportEntry.model_fields)-{"product_id","market_ids"})|metadata
    for item in batch.entries:
        if set(item)-allowed:raise HTTPException(422,"Há campos não reconhecidos no arquivo.")
        url=item.get("product_source_url");prefix=item.get("market_prefix")
        if not isinstance(url,str) or len(url)>500 or not isinstance(prefix,str) or prefix not in {"Carone","Sempretem","Extrabom","Supermercados BH"}:raise HTTPException(422,"Informe produto e rede válidos no arquivo.")
        cities=item.get("cities",[]);excluded=item.get("excluded_markets",[])
        if any(not isinstance(values,list) or any(not isinstance(v,str) for v in values) for values in (cities,excluded)):raise HTTPException(422,"Cidades e exclusões devem ser listas de nomes.")
        product=db.scalar(select(Product).where(Product.catalog_source_url==url,Product.is_active.is_(True)))
        if not product:raise HTTPException(422,"Um produto do arquivo não foi encontrado no catálogo. Nenhum produto foi criado automaticamente.")
        markets=[m.id for m in db.scalars(select(Market).where(Market.is_active.is_(True),Market.state=="ES")) if m.name.startswith(prefix) and m.name not in excluded and (not cities or m.city in cities)]
        fields={k:v for k,v in item.items() if k not in metadata}
        try:prepared.append(ImportEntry.model_validate({**fields,"product_id":product.id,"market_ids":markets}))
        except ValidationError:raise HTTPException(422,"Há preço, unidade, validade ou fonte inválida no arquivo.")
    converted=ImportBatch(entries=prepared)
    rows=plan(db,converted,datetime.now(timezone.utc))
    return {"batch":converted.model_dump(mode="json"),"rows":view(rows),"published":False}

@router.post("/preview")
def preview(batch:ImportBatch,db:Session=Depends(get_db),admin:User=Depends(get_admin_user)):
    return {"rows":view(plan(db,batch,datetime.now(timezone.utc))),"published":False}

@router.post("/publish")
def publish(batch:ImportBatch,db:Session=Depends(get_db),admin:User=Depends(get_admin_user)):
    if not batch.reviewed:raise HTTPException(422,"Confirme a revisão dos preços, das lojas e da validade.")
    now=datetime.now(timezone.utc)
    if db.get_bind().dialect.name=="postgresql":db.execute(text("SELECT pg_advisory_xact_lock(73111601)"))
    rows=plan(db,batch,now);added_prices=added_offers=0
    for entry,product,market in rows:
        if entry.regular_price is not None:
            existing=db.scalar(select(PriceReport.id).where(PriceReport.product_id==product.id,PriceReport.market_id==market.id,PriceReport.price==entry.regular_price,PriceReport.expires_at==entry.valid_until,PriceReport.source_url==entry.source_url,PriceReport.source_type=="official_flyer"))
            if existing is None:
                db.add(PriceReport(product_id=product.id,market_id=market.id,user_id=admin.id,price=entry.regular_price,reported_at=now,expires_at=entry.valid_until,source_type="official_flyer",source_url=entry.source_url,notes=f"Importação revisada em {now.isoformat()}. Sem clube. {entry.conditions}",is_active=True))
                added_prices+=1
        promo_price=entry.club_price if entry.club_price is not None else entry.regular_price
        terms=(f"Exige {entry.club_name}. "+(f"Sem clube: R$ {entry.regular_price:.2f}. " if entry.regular_price is not None else "Preço sem clube não informado. ") if entry.club_price is not None else "Preço sem exigência de clube. ")+entry.conditions
        existing=db.scalar(select(Offer.id).where(Offer.product_id==product.id,Offer.market_id==market.id,Offer.price==promo_price,Offer.expires_at==entry.valid_until,Offer.source_url==entry.source_url))
        if existing is None:
            # A revised price from the same leaflet replaces the active card;
            # observations remain in PriceReport for history and audit.
            previous=list(db.scalars(select(Offer).where(Offer.product_id==product.id,Offer.market_id==market.id,Offer.source_url==entry.source_url,Offer.ended_at.is_(None),Offer.expires_at>now)))
            for prior in previous:prior.ended_at=now
            db.add(Offer(product_id=product.id,market_id=market.id,user_id=admin.id,price=promo_price,conditions=terms,observed_at=now,expires_at=entry.valid_until,source_url=entry.source_url,source_label="Folheto oficial · revisão administrativa"))
            added_offers+=1
    db.commit()
    return {"added_prices":added_prices,"added_offers":added_offers,"checked_at":now,"rows":len(rows)}

@router.get("/latest")
def latest(db:Session=Depends(get_db),admin:User=Depends(get_admin_user)):
    observed=db.scalar(select(Offer.observed_at).where(Offer.source_label=="Folheto oficial · revisão administrativa").order_by(Offer.observed_at.desc()).limit(1))
    latest_official=db.scalar(select(Offer.observed_at).where(Offer.source_url.is_not(None)).order_by(Offer.observed_at.desc()).limit(1))
    return {"last_import_at":observed,"last_official_update_at":latest_official}
