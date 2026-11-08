from fastapi import HTTPException
from sqlalchemy import select,update,func
from app.models import ShoppingList
from app.models.family import ListMember

def can_access(db,shopping_list,user_id):
    return shopping_list and (shopping_list.user_id==user_id or db.scalar(select(ListMember.id).where(ListMember.list_id==shopping_list.id,ListMember.user_id==user_id)) is not None)

def get_access(db,list_id,user_id,owner_only=False):
    row=db.get(ShoppingList,list_id)
    if not row or (row.user_id!=user_id if owner_only else not can_access(db,row,user_id)):
        raise HTTPException(404,'Lista não encontrada')
    return row

def claim_revision(db,row,revision):
    if revision is None:
        raise HTTPException(409,'Esta lista mudou. Abra a lista novamente antes de salvar.')
    changed=db.execute(update(ShoppingList).where(ShoppingList.id==row.id,ShoppingList.revision==revision).values(revision=ShoppingList.revision+1,updated_at=func.now()).execution_options(synchronize_session=False)).rowcount
    if not changed:
        db.rollback()
        raise HTTPException(409,'Outra pessoa atualizou a lista. Confira as mudanças e tente novamente.')
    db.expire(row,['revision'])
