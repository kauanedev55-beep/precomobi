from app.core.config import get_settings
from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Market, PriceReport, ShoppingList, ShoppingListItem, User
from app.schemas.mvp import ComparisonRead

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


@router.get("/{shopping_list_id}", response_model=ComparisonRead)
def compare_shopping_list(
    shopping_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    shopping_list = db.scalar(
        select(ShoppingList)
        .options(selectinload(ShoppingList.items).selectinload(ShoppingListItem.product))
        .where(ShoppingList.id == shopping_list_id)
    )
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista não encontrada")

    markets = list(db.scalars(select(Market).where(Market.is_active.is_(True)).order_by(Market.name)))
    product_ids = [item.product_id for item in shopping_list.items]
    reports = list(
        db.scalars(
            select(PriceReport)
            .where(PriceReport.product_id.in_(product_ids), PriceReport.is_active.is_(True), True if get_settings().demo_mode else PriceReport.source_type != "development")
            .order_by(PriceReport.reported_at.desc(), PriceReport.id.desc())
        )
    ) if product_ids else []

    latest: dict[tuple[int, int], PriceReport] = {}
    for report in reports:
        latest.setdefault((report.market_id, report.product_id), report)

    results = []
    for market in markets:
        comparison_items = []
        total = Decimal("0")
        found_items = 0
        for list_item in shopping_list.items:
            report = latest.get((market.id, list_item.product_id))
            unit_price = report.price if report else None
            subtotal = (unit_price * list_item.quantity) if unit_price is not None else None
            if subtotal is not None:
                total += subtotal
                found_items += 1
            comparison_items.append({
                "product_id": list_item.product_id,
                "product_name": list_item.product.name,
                "quantity": list_item.quantity,
                "unit_price": unit_price,
                "subtotal": subtotal,
                "reported_at": report.reported_at if report else None,
                "source_type": report.source_type if report else None,
            })
        results.append({
            "market_id": market.id,
            "market_name": market.name,
            "complete": bool(shopping_list.items) and found_items == len(shopping_list.items),
            "found_items": found_items,
            "total_items": len(shopping_list.items),
            "total": total if shopping_list.items and found_items == len(shopping_list.items) else None,
            "items": comparison_items,
        })

    results.sort(key=lambda result: (not result["complete"], result["total"] is None, result["total"] if result["total"] is not None else Decimal("Infinity")))
    return {"shopping_list_id": shopping_list.id, "list_name": shopping_list.name, "results": results[:3]}
