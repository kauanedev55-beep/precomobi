"""Reviewed physical-store leaflets; never infer validity or copy online prices."""
import json,secrets
from datetime import datetime,timezone
from decimal import Decimal
from pathlib import Path
from sqlalchemy import select,text
from sqlalchemy.orm import Session
from app.models import Product,Market,User,PriceReport
from app.models.offers import Offer
from app.core.security import hash_password

KEY='official-reviewed-leaflets-2026-11-07'
def seed_official_flyers(engine,manifest=None,now=None):
    now=now or datetime.now(timezone.utc)
    entries=manifest if manifest is not None else json.loads(Path(__file__).with_name('official_flyers_20261107.json').read_text())
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE IF NOT EXISTS app_data_migrations (migration_key VARCHAR(100) PRIMARY KEY)'))
        marker=connection.execute(text('INSERT INTO app_data_migrations (migration_key) VALUES (:key) ON CONFLICT (migration_key) DO NOTHING RETURNING migration_key'),{'key':KEY}).scalar()
        if marker is None:return
        with Session(bind=connection) as db:
            actor=db.scalar(select(User).where(User.email=='catalogos-oficiais@precomobi.invalid'))
            for entry in entries:
                start=datetime.fromisoformat(entry['valid_from']).astimezone(timezone.utc);end=datetime.fromisoformat(entry['valid_until']).astimezone(timezone.utc)
                # Future or expired editions never become current prices.
                if not(start<=now<end):continue
                product=db.scalar(select(Product).where(Product.catalog_source_url==entry['product_source_url'],Product.is_active.is_(True)))
                if not product:continue
                if product.sale_unit!=entry['sale_unit']:raise ValueError('Sale-unit mismatch in reviewed leaflet')
                markets=list(db.scalars(select(Market).where(Market.is_active.is_(True),Market.state=='ES')))
                markets=[m for m in markets if m.name.startswith(entry['market_prefix']) and m.name not in entry.get('excluded_markets',[])]
                if not markets:continue
                if actor is None:
                    actor=User(name='Catálogos oficiais · revisão manual',email='catalogos-oficiais@precomobi.invalid',password_hash=hash_password(secrets.token_urlsafe(48)),is_active=False,email_verified=False)
                    db.add(actor);db.flush()
                for market in markets:
                    terms=(f"Exige {entry['club_name']}. Sem clube: R$ {entry['regular_price'].replace('.',',')} por {'kg' if product.sale_unit=='kg' else 'embalagem/unidade'}. " if entry.get('club_price') else "Preço sem exigência de clube. ")+entry['conditions']
                    db.add(Offer(product_id=product.id,market_id=market.id,user_id=actor.id,price=Decimal(entry.get('club_price') or entry['regular_price']),conditions=terms[:500],observed_at=now,expires_at=end,source_url=entry['source_url'],source_label=entry['source_label']))
                    # The explicit non-club leaflet price is eligible for a basket;
                    # a more recent community observation keeps precedence.
                    db.add(PriceReport(product_id=product.id,market_id=market.id,user_id=actor.id,price=Decimal(entry['regular_price']),reported_at=start,expires_at=end,source_type='official_flyer',source_url=entry['source_url'],notes=f"Sem clube. {entry['conditions']} Conferido em {now.isoformat()}.",is_active=True))
            db.flush()
