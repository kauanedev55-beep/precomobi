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
    assert len(entries)==6 and {e["valid_until"] for e in entries}=={"2026-11-28T23:59:59-03:00","2026-11-21T23:59:59-03:00"}
    engine=create_engine(f"sqlite:///{tmp_path/'current.db'}");Base.metadata.create_all(engine)
    with Session(engine) as db:
        for e in {e["product_source_url"]:e for e in entries}.values():db.add(Product(name=e["product_name"],catalog_source_url=e["product_source_url"],sale_unit=e["sale_unit"],is_active=True))
        db.add_all([Market(name="Carone Serra",address="Rua",city="Serra",state="ES"),Market(name="Carone RJ",address="Rua",city="Cabo Frio",state="RJ"),Market(name="Sempretem Serra",address="Rua",city="Serra",state="ES")]);db.commit()
    now=datetime(2026,11,16,20,tzinfo=timezone.utc)
    seed_official_flyers_nov16(engine,now);seed_official_flyers_nov16(engine,now)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(PriceReport))==6
        assert db.scalar(select(func.count()).select_from(Offer))==6
        p=db.scalar(select(Product).where(Product.name.like("Café Melitta%")))
        report=db.scalar(select(PriceReport).where(PriceReport.product_id==p.id))
        offer=db.scalar(select(Offer).where(Offer.product_id==p.id))
        assert report.price==Decimal("13.59") and offer.price==Decimal("11.98")
        assert offer.conditions.startswith("Exige Clube Carone.")
        assert all(r.market.state=="ES" and r.source_url and r.expires_at for r in db.scalars(select(PriceReport)))
        from app.api.comparisons import build_comparison
        import app.api.comparisons as comparison_api
        from types import SimpleNamespace
        from sqlalchemy import literal
        # Use the edition's date for the SQL clock as well.
        from unittest.mock import patch
        cut=db.scalar(select(Product).where(Product.catalog_source_url=="https://www.carone.com.br/carre-suino-kg-14250/p"))
        draft=SimpleNamespace(id=None,name="Comparação real por tipo de corte",items=[SimpleNamespace(product_id=cut.id,quantity=Decimal("1"),product=cut)])
        with patch.object(comparison_api,"func",SimpleNamespace(now=lambda:literal(now.replace(tzinfo=None)))):
            result=build_comparison(db,draft,"Serra")
        totals={row["market_name"]:row["total"] for row in result["results"]}
        assert totals=={"Sempretem Serra":Decimal("14.69"),"Carone Serra":Decimal("15.99")}
    engine.dispose()
