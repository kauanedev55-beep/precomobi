from fastapi import APIRouter,Depends,HTTPException,Request,Response
from pydantic import BaseModel,Field,ConfigDict
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.product_photo import normalize_photo,save_photo
from app.db.session import get_db
from app.models import Product,ProductPhoto,User
from app.schemas.mvp import ProductRead

router=APIRouter(prefix='/products',tags=['catalog'])
class PhotoUpload(BaseModel):
    model_config=ConfigDict(extra='forbid')
    photo_data:str=Field(min_length=30,max_length=350000)

@router.get('/{product_id}/photo',name='product_photo')
def product_photo(product_id:int,db:Session=Depends(get_db)):
    product=db.get(Product,product_id);photo=db.get(ProductPhoto,product_id)
    if not product or not product.is_active or not photo:raise HTTPException(404,'Foto não encontrada.')
    return Response(content=photo.content,media_type='image/jpeg',headers={'X-Content-Type-Options':'nosniff'})

@router.post('/{product_id}/photo',response_model=ProductRead)
def update_product_photo(product_id:int,payload:PhotoUpload,request:Request,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    product=db.get(Product,product_id)
    if not product or not product.is_active:raise HTTPException(404,'Produto não encontrado.')
    if product.created_by_id!=user.id and not user.is_admin:raise HTTPException(403,'Somente quem cadastrou o produto ou a administradora pode alterar sua foto.')
    content=normalize_photo(payload.photo_data)
    save_photo(db,product,user,content,request);db.commit();db.refresh(product)
    return product
