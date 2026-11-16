import json
from pathlib import Path
from datetime import datetime,timezone
from decimal import Decimal
from sqlalchemy import create_engine,select,func
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.official_flyers import seed_official_flyers_nov16
from app.models import Product,Market,PriceReport
from app.models.offers import Offer

def test_reviewed_current_edition_is_separate_and_does_not_duplicate(tmp_path):
    entries=json.loads((Path(__file__).resolve().parents[1]/"backend/app/db/official_flyers_20261116.json").read_text())
    assert len(entries)==4 and {e["valid_until"] for e in entries}=={"2026-11-28T23:59:59-03:00"}
    engine=create_engine(f"sqlite:///{tmp_path/'current.db'}");Base.metadata.create_all(engine)
    with Session(engine) as db:
        for e in entries:db.add(Product(name=e["product_name"],catalog_source_url=e["product_source_url"],sale_unit=e["sale_unit"],is_active=True))
        db.add_all([Market(name="Carone Serra",address="Rua",city="Serra",state="ES"),Market(name="Carone RJ",address="Rua",city="Cabo Frio",state="RJ"),Market(name="Sempretem Serra",address="Rua",city="Serra",state="ES")]);db.commit()
    now=datetime(2026,11,16,20,tzinfo=timezone.utc)
    seed_official_flyers_nov16(engine,now);seed_official_flyers_nov16(engine,now)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(PriceReport))==4
        assert db.scalar(select(func.count()).select_from(Offer))==4
        p=db.scalar(select(Product).where(Product.name.like("Café Melitta%")))
        report=db.scalar(select(PriceReport).where(PriceReport.product_id==p.id))
        offer=db.scalar(select(Offer).where(Offer.product_id==p.id))
        assert report.price==Decimal("13.59") and offer.price==Decimal("11.98")
        assert offer.conditions.startswith("Exige Clube Carone.")
        assert all(r.market.name=="Carone Serra" and r.source_url and r.expires_at for r in db.scalars(select(PriceReport)))
    engine.dispose()
