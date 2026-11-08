from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_, delete
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Product, ShoppingList, ShoppingListItem, User
from app.models.family import ListMember,ListInvite
from app.core.family_lists import can_access,claim_revision
from app.schemas.mvp import ShoppingListCreate, ShoppingListRead

router = APIRouter(prefix="/shopping-lists", tags=["shopping-lists"])


@router.post("", response_model=ShoppingListRead, status_code=201)
def create_shopping_list(
    payload: ShoppingListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShoppingList:
    product_ids = [item.product_id for item in payload.items]
    products = list(db.scalars(select(Product).where(Product.id.in_(product_ids), Product.is_active.is_(True)))) if product_ids else []
    products_by_id = {product.id: product for product in products}
    missing_ids = sorted(set(product_ids) - set(products_by_id))
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Produtos não encontrados: {missing_ids}")

    shopping_list = ShoppingList(name=payload.name, user_id=current_user.id)
    shopping_list.items = [
        ShoppingListItem(product_id=item.product_id, quantity=item.quantity, is_purchased=item.is_purchased)
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
    current_user: User = Depends(get_current_user),
) -> list[ShoppingList]:
    return list(
        db.scalars(
            select(ShoppingList)
            .options(selectinload(ShoppingList.items).selectinload(ShoppingListItem.product))
            .where(or_(ShoppingList.user_id == current_user.id, ShoppingList.id.in_(select(ListMember.list_id).where(ListMember.user_id==current_user.id))))
            .order_by(ShoppingList.created_at.desc())
        )
    )


@router.get("/{shopping_list_id}", response_model=ShoppingListRead)
def get_shopping_list(
    shopping_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShoppingList:
    shopping_list = db.scalar(
        select(ShoppingList)
        .options(selectinload(ShoppingList.items).selectinload(ShoppingListItem.product))
        .where(ShoppingList.id == shopping_list_id)
    )
    if not can_access(db,shopping_list,current_user.id):
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    return shopping_list


@router.put("/{shopping_list_id}", response_model=ShoppingListRead)
def update_shopping_list(
    shopping_list_id: int,
    payload: ShoppingListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ShoppingList:
    shopping_list = db.get(ShoppingList, shopping_list_id)
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    product_ids = {item.product_id for item in payload.items}
    found = set(db.scalars(select(Product.id).where(Product.id.in_(product_ids), Product.is_active.is_(True))))
    missing_ids = sorted(product_ids - found)
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Produtos não encontrados: {missing_ids}")
    if shopping_list.status=="completed":
        raise HTTPException(409,"Reabra a lista para alterar seus produtos")
    if db.scalar(select(ListMember.id).where(ListMember.list_id==shopping_list.id)) or payload.revision is not None:
        claim_revision(db,shopping_list,payload.revision)
    else:
        claim_revision(db,shopping_list,shopping_list.revision)
    shopping_list.name = payload.name
    shopping_list.updated_at = datetime.now(timezone.utc)
    shopping_list.items = [ShoppingListItem(product_id=item.product_id, quantity=item.quantity, is_purchased=item.is_purchased) for item in payload.items]
    db.commit()
    return get_shopping_list(shopping_list_id, db, current_user)


@router.delete("/{shopping_list_id}", status_code=204)
def delete_shopping_list(
    shopping_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    shopping_list = db.get(ShoppingList, shopping_list_id)
    if not shopping_list or shopping_list.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    db.execute(delete(ListInvite).where(ListInvite.list_id==shopping_list_id))
    db.execute(delete(ListMember).where(ListMember.list_id==shopping_list_id))
    db.delete(shopping_list)
    db.commit()
