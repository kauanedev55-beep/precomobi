"""Small public product photos, stored persistently without phone metadata."""
import base64,binascii,hashlib,os
from datetime import datetime,timezone
from io import BytesIO
from fastapi import HTTPException,Request
from PIL import Image,ImageOps,UnidentifiedImageError
from sqlalchemy import select,func
from app.core.config import get_settings
from app.models import ProductPhoto

MAX_PHOTO_BYTES=128*1024

def normalize_photo(data):
    try:
        prefix,encoded=data.split(',',1)
        if prefix not in {'data:image/jpeg;base64','data:image/png;base64'}:raise ValueError()
        raw=base64.b64decode(encoded,validate=True)
        if not raw or len(raw)>256*1024:raise ValueError()
        with Image.open(BytesIO(raw)) as image:
            if image.format not in {'JPEG','PNG'} or min(image.size)<16 or max(image.size)>2048 or image.width*image.height>4_000_000:raise ValueError()
            image.load()
            image=ImageOps.exif_transpose(image).convert('RGBA')
            image.thumbnail((640,640))
            clean=Image.new('RGB',image.size,'white');clean.paste(image,mask=image.getchannel('A'))
            for quality in (82,65,45):
                output=BytesIO();clean.save(output,format='JPEG',quality=quality,optimize=True)
                if len(output.getvalue())<=MAX_PHOTO_BYTES:return output.getvalue()
    except (ValueError,TypeError,binascii.Error,UnidentifiedImageError,OSError,Image.DecompressionBombError):pass
    raise HTTPException(422,'Foto inválida. Escolha uma imagem JPEG ou PNG menor.')

def save_photo(db,product,user,content,request:Request):
    # Limit new daily media storage while keeping ordinary product registration free.
    today=datetime.now(timezone.utc).replace(hour=0,minute=0,second=0,microsecond=0)
    count=db.scalar(select(func.count()).select_from(ProductPhoto).where(ProductPhoto.uploaded_by_id==user.id,ProductPhoto.updated_at>=today,ProductPhoto.product_id!=product.id))
    if not user.is_admin and count>=50:raise HTTPException(429,'Limite diário de fotos atingido. Tente novamente amanhã.')
    digest=hashlib.sha256(content).hexdigest()
    photo=db.get(ProductPhoto,product.id)
    if photo is None:photo=ProductPhoto(product_id=product.id);db.add(photo)
    photo.content=content;photo.digest=digest;photo.uploaded_by_id=user.id;photo.updated_at=datetime.now(timezone.utc)
    origin=os.environ.get('RENDER_EXTERNAL_URL','').rstrip('/') or str(request.base_url).rstrip('/')
    if get_settings().app_env.lower()=='production' and origin.startswith('http://'):origin='https://'+origin[7:]
    product.image_url=f'{origin}{get_settings().api_prefix}/products/{product.id}/photo?v={digest[:16]}'
