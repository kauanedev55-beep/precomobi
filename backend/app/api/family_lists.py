"""Private family lists: explicit invitations and revision-protected mutations."""
import hashlib,secrets
from datetime import datetime,timedelta,timezone
from decimal import Decimal
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field,model_validator
from sqlalchemy import select,delete
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ShoppingList,ShoppingListItem,User,Product
from app.models.family import ListMember,ListInvite
from app.core.family_lists import get_access,claim_revision
from app.schemas.mvp import ShoppingListRead

router=APIRouter(prefix='/family-lists',tags=['family-lists'])

def digest(token):return hashlib.sha256(token.encode()).hexdigest()
def invite_for(db,token):
    invite=db.scalar(select(ListInvite).where(ListInvite.token_hash==digest(token)))
    expiry=invite.expires_at.replace(tzinfo=timezone.utc) if invite and invite.expires_at.tzinfo is None else invite.expires_at if invite else None
    if not invite or expiry<=datetime.now(timezone.utc):raise HTTPException(404,'Este convite expirou ou foi encerrado. Peça um novo link.')
    return invite

def details(db,row,user):
    ids=list(db.scalars(select(ListMember.user_id).where(ListMember.list_id==row.id)))
    people=list(db.scalars(select(User).where(User.id.in_([row.user_id,*ids]))))
    return dict(list=ShoppingListRead.model_validate(row),is_owner=row.user_id==user.id,participants=[dict(id=p.id,name=p.name,owner=p.id==row.user_id) for p in people])

@router.get('/invites/{token}')
def preview_invite(token:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    invite=invite_for(db,token);row=db.get(ShoppingList,invite.list_id)
    if not row:raise HTTPException(404,'Lista não encontrada')
    return dict(name=row.name,owner_name=db.get(User,row.user_id).name,expires_at=invite.expires_at)

@router.post('/invites/{token}/accept')
def accept_invite(token:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    invite=invite_for(db,token);row=db.get(ShoppingList,invite.list_id)
    # Serialize acceptance against revoke/removal with the same list-row lock.
    db.execute(select(ShoppingList.id).where(ShoppingList.id==row.id).with_for_update())
    invite_for(db,token)
    if row.user_id!=user.id and not db.scalar(select(ListMember.id).where(ListMember.list_id==row.id,ListMember.user_id==user.id)):
        db.add(ListMember(list_id=row.id,user_id=user.id))
    db.commit()
    return details(db,row,user)

@router.get('/{list_id}')
def get_family(list_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    return details(db,get_access(db,list_id,user.id),user)

@router.post('/{list_id}/invite')
def create_invite(list_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    row=get_access(db,list_id,user.id,owner_only=True)
    db.execute(select(ShoppingList.id).where(ShoppingList.id==row.id).with_for_update())
    token=secrets.token_urlsafe(32);expires=datetime.now(timezone.utc)+timedelta(days=7)
    db.add(ListInvite(list_id=row.id,token_hash=digest(token),expires_at=expires));db.commit()
    return dict(token=token,expires_at=expires)

@router.delete('/{list_id}/invites',status_code=204)
def revoke_invites(list_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    get_access(db,list_id,user.id,owner_only=True)
    db.execute(select(ShoppingList.id).where(ShoppingList.id==list_id).with_for_update())
    db.execute(delete(ListInvite).where(ListInvite.list_id==list_id));db.commit()

@router.delete('/{list_id}/members/{user_id}',status_code=204)
def remove_member(list_id:int,user_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    row=get_access(db,list_id,user.id,owner_only=True)
    if user_id==row.user_id:raise HTTPException(422,'A pessoa responsável não pode ser removida')
    db.execute(select(ShoppingList.id).where(ShoppingList.id==list_id).with_for_update())
    db.execute(delete(ListMember).where(ListMember.list_id==list_id,ListMember.user_id==user_id))
    # Old invitation links cannot immediately rejoin after removal.
    db.execute(delete(ListInvite).where(ListInvite.list_id==list_id));db.commit()

class ListChange(BaseModel):
    revision:int=Field(ge=1)
    name:str|None=Field(default=None,min_length=1,max_length=160)
    status:Literal['preparation','shopping','completed']|None=None
    complete_with_pending:bool=False

@router.patch('/{list_id}')
def change_list(list_id:int,payload:ListChange,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    row=get_access(db,list_id,user.id)
    if payload.name is not None and not payload.name.strip():raise HTTPException(422,'Informe o nome da lista')
    if payload.status=='completed' and any(not item.is_purchased for item in row.items) and not payload.complete_with_pending:
        raise HTTPException(409,'Há produtos pendentes. Confirme se deseja concluir mesmo assim.')
    claim_revision(db,row,payload.revision)
    get_access(db,list_id,user.id)
    if payload.name is not None:row.name=payload.name.strip()
    if payload.status:row.status=payload.status
    db.commit();db.refresh(row)
    return details(db,row,user)

class ItemChange(BaseModel):
    revision:int=Field(ge=1)
    product_id:int
    action:Literal['add','set','remove','check']
    quantity:Decimal|None=Field(default=None,gt=0,max_digits=10,decimal_places=3)
    is_purchased:bool|None=None
    @model_validator(mode='after')
    def required_values(self):
        if self.action in ('add','set') and self.quantity is None:raise ValueError('Informe a quantidade')
        if self.action=='check' and self.is_purchased is None:raise ValueError('Informe se já pegou o produto')
        return self

@router.patch('/{list_id}/items')
def change_item(list_id:int,payload:ItemChange,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    row=get_access(db,list_id,user.id)
    if row.status=='completed':raise HTTPException(409,'Reabra a lista antes de alterar os produtos')
    product=db.get(Product,payload.product_id)
    if not product or not product.is_active:raise HTTPException(404,'Produto não encontrado')
    if payload.quantity is not None and product.sale_unit!='kg' and payload.quantity!=payload.quantity.to_integral_value():raise HTTPException(422,'Use quantidade inteira para embalagens ou unidades')
    claim_revision(db,row,payload.revision)
    get_access(db,list_id,user.id)
    item=db.scalar(select(ShoppingListItem).where(ShoppingListItem.shopping_list_id==row.id,ShoppingListItem.product_id==payload.product_id))
    if payload.action=='add':
        if item:
            if item.quantity+payload.quantity>Decimal('9999999.999'):raise HTTPException(422,'A quantidade ultrapassa o limite da lista')
            item.quantity+=payload.quantity;item.is_purchased=False
        else:
            if len(row.items)>=200:raise HTTPException(422,'A lista pode ter até 200 produtos')
            db.add(ShoppingListItem(shopping_list_id=row.id,product_id=payload.product_id,quantity=payload.quantity,is_purchased=False))
    elif not item:raise HTTPException(404,'Este produto não está mais na lista')
    elif payload.action=='remove':db.delete(item)
    elif payload.action=='set':item.quantity=payload.quantity
    else:item.is_purchased=payload.is_purchased
    db.commit();db.expire(row,['items']);db.refresh(row)
    return details(db,row,user)
