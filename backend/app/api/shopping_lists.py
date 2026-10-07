from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.models import Product, ShoppingList, ShoppingListItem, User
from app.schemas.mvp import ShoppingListCreate, ShoppingListRead

router = APIRouter(prefix="/shopping-lists", tags=["shopping-lists"])


@router.post("", response_model=ShoppingListRead, status_code=201)
def create_shopping_list(
    payload: ShoppingListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> ShoppingList:
    product_ids = [item.product_id for item in payload.items]
    products = list(db.scalars(select(Product).where(Product.id.in_(product_ids)))) if product_ids else []
    products_by_id = {product.id: product for product in products}
    missing_ids = sorted(set(product_ids) - set(products_by_id))
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Produtos não encontrados: {missing_ids}")

    shopping_list = ShoppingList(name=payload.name, user_id=current_user.id)
    shopping_list.items = [
        ShoppingListItem(product_id=item.product_id, quantity=item.quantity)
        for item in payload.items
    ]
    db.add(shopping_list)
    db.commit()
    db.refresh(shopping_list)
    return db.scalar(
        select(ShoppingList)
        .options(selectinload(ShoppingList.items).selectinload(ShoppingListItem.product))
        .where(ShoppingList.id == shopping_list.id)
    )


@router.get("", response_model=list[ShoppingListRead])
def list_shopping_lists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> list[ShoppingList]:
    return list(
        db.scalars(
            select(ShoppingList)
            .options(selectinload(ShoppingList.items).selectinload(ShoppingListItem.product))
            .where(ShoppingList.user_id == current_user.id)
            .order_by(ShoppingList.created_at.desc())
        )
    )


@router.get("/{shopping_list_id}", response_model=ShoppingListRead)
def get_shopping_list(
    shopping_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> ShoppingList:
    shopping_list = db.scalar(
        select(ShoppingList)
        .options(selectinload(ShoppingList.items).selectinload(ShoppingListItem.product))
        .where(ShoppingList.id == shopping_list_id)
    )
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    return shopping_list


@router.delete("/{shopping_list_id}", status_code=204)
def delete_shopping_list(
    shopping_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    shopping_list = db.get(ShoppingList, shopping_list_id)
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    db.delete(shopping_list)
    db.commit()
