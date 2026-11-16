from datetime import datetime,timedelta,timezone
from decimal import Decimal
import pytest
from sqlalchemy import delete,select,func
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Product,Market,PriceReport
from app.models.offers import Offer
from conftest import register_user

@pytest.fixture
def import_setup(client,monkeypatch):
    headers,user=register_user(client)
    monkeypatch.setattr(get_settings(),"admin_emails",user["email"])
    with SessionLocal() as db:
        p=Product(name="Produto exclusivo para testar importação",sale_unit="unit",is_active=True)
        m=Market(name="Carone Importação Teste",address="Rua Teste",city="Serra",state="ES",is_active=True)
        wrong=Market(name="Sempretem Importação Teste",address="Rua Teste",city="Serra",state="ES",is_active=True)
        db.add_all([p,m,wrong]);db.commit();ids=(p.id,m.id,wrong.id)
    now=datetime.now(timezone.utc)
    entry={"product_id":ids[0],"market_ids":[ids[1]],"sale_unit":"unit","regular_price":"7.49","club_price":"6.99","club_name":"Clube Carone","conditions":"Somente as lojas revisadas no folheto.","valid_from":(now-timedelta(hours=1)).isoformat(),"valid_until":(now+timedelta(days=2)).isoformat(),"source_url":"https://www.flipsnack.com/carone/folheto-teste-esp-rito-santo"}
    yield headers,entry,ids
    with SessionLocal() as db:
        db.execute(delete(Offer).where(Offer.product_id==ids[0]))
        db.execute(delete(PriceReport).where(PriceReport.product_id==ids[0]))
        db.execute(delete(Product).where(Product.id==ids[0]))
        db.execute(delete(Market).where(Market.id.in_(ids[1:])))
        db.commit()

def test_preview_publish_and_retry_preserve_club_separation(client,import_setup):
    headers,entry,ids=import_setup;batch={"entries":[entry]}
    preview=client.post("/api/admin/price-import/preview",headers=headers,json=batch)
    assert preview.status_code==200 and preview.json()["published"] is False
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(PriceReport).where(PriceReport.product_id==ids[0]))==0
    assert client.post("/api/admin/price-import/publish",headers=headers,json=batch).status_code==422
    batch["reviewed"]=True
    response=client.post("/api/admin/price-import/publish",headers=headers,json=batch)
    assert response.status_code==200 and response.json()["added_prices"]==1 and response.json()["added_offers"]==1
    again=client.post("/api/admin/price-import/publish",headers=headers,json=batch)
    assert again.json()["added_prices"]==0 and again.json()["added_offers"]==0
    with SessionLocal() as db:
        report=db.scalar(select(PriceReport).where(PriceReport.product_id==ids[0]))
        offer=db.scalar(select(Offer).where(Offer.product_id==ids[0]))
        assert report.price==Decimal("7.49") and offer.price==Decimal("6.99")
        assert report.market_id==ids[1] and report.expires_at and report.source_url
    assert client.get("/api/admin/price-import/latest",headers=headers).json()["last_import_at"]

def test_admin_auth_is_required(client,import_setup):
    _,entry,_=import_setup
    assert client.post("/api/admin/price-import/preview",json={"entries":[entry]}).status_code==401
    regular,_=register_user(client)
    assert client.post("/api/admin/price-import/publish",headers=regular,json={"entries":[entry],"reviewed":True}).status_code==403

@pytest.mark.parametrize("change",[
 {"sale_unit":"kg"},{"source_url":"https://www.carone.com.br.evil.invalid/flyer"},
 {"source_url":"http://www.carone.com.br/flyer"},{"regular_price":"0"},
 {"valid_until":"2020-01-01T00:00:00Z"},{"valid_until":"2099-01-01T00:00:00Z"},
 {"club_name":None},{"valid_from":"2020-01-01T00:00:00"},{"product_id":999999999},
])
def test_invalid_batch_never_partially_writes(client,import_setup,change):
    headers,entry,ids=import_setup
    bad={**entry,**change}
    response=client.post("/api/admin/price-import/publish",headers=headers,json={"entries":[entry,bad],"reviewed":True})
    assert response.status_code==422
    with SessionLocal() as db:assert db.scalar(select(func.count()).select_from(PriceReport).where(PriceReport.product_id==ids[0]))==0

def test_wrong_chain_and_club_only_cannot_become_regular_price(client,import_setup):
    headers,entry,ids=import_setup
    wrong={**entry,"market_ids":[ids[2]]}
    assert client.post("/api/admin/price-import/publish",headers=headers,json={"entries":[wrong],"reviewed":True}).status_code==422
    club_only={**entry,"regular_price":None}
    result=client.post("/api/admin/price-import/publish",headers=headers,json={"entries":[club_only],"reviewed":True})
    assert result.status_code==200 and result.json()["added_prices"]==0 and result.json()["added_offers"]==1
