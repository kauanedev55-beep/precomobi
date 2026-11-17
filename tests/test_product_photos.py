import base64,uuid
from io import BytesIO
from urllib.parse import urlsplit
from PIL import Image
from sqlalchemy import select,func,delete
from app.db.session import SessionLocal
from app.models import Product,ProductPhoto
from conftest import register_user


def photo_data(color='red',metadata=True):
    image=Image.new('RGB',(900,600),color)
    output=BytesIO()
    exif=Image.Exif()
    if metadata:exif[270]='private camera metadata';exif[315]='phone owner'
    image.save(output,format='JPEG',exif=exif)
    return 'data:image/jpeg;base64,'+base64.b64encode(output.getvalue()).decode()


def payload(photo=None):
    return dict(name='Foto de produto teste '+uuid.uuid4().hex[:10],category='Outros',brand=None,no_brand=True,ean=None,no_barcode=True,sale_unit='unit',packaging='Unidade',quantity_value='1',quantity_unit='un',photo_data=photo)


def test_customer_photo_is_persistent_public_and_metadata_free(client):
    owner,user=register_user(client)
    response=client.post('/api/products',headers=owner,json=payload(photo_data()))
    assert response.status_code==201,response.text
    product=response.json();url=product['image_url'];parts=urlsplit(url)
    image=client.get(parts.path+'?'+parts.query)
    assert image.status_code==200 and image.headers['content-type']=='image/jpeg'
    assert image.headers['x-content-type-options']=='nosniff'
    with Image.open(BytesIO(image.content)) as checked:
        assert checked.size==(640,427) and checked.format=='JPEG'
        assert not checked.getexif() and len(image.content)<=128*1024
    with SessionLocal() as db:
        row=db.get(ProductPhoto,product['id'])
        assert row and row.uploaded_by_id==user['id'] and row.content==image.content
    public=client.get(f"/api/products/{product['id']}").json()
    assert public['image_url']==url and public['can_edit_photo'] is False
    assert client.get(f"/api/products/{product['id']}",headers=owner).json()['can_edit_photo'] is True
    assert next(p['image_url'] for p in client.get('/api/products',params={'q':product['name'],'external':False}).json() if p['id']==product['id'])==url
    with SessionLocal() as db:
        db.execute(delete(ProductPhoto).where(ProductPhoto.product_id==product['id']));db.execute(delete(Product).where(Product.id==product['id']));db.commit()


def test_existing_product_photo_requires_creator_or_admin_and_preserves_other_data(client,monkeypatch):
    from app.core.config import get_settings
    owner,_=register_user(client);other,other_user=register_user(client)
    product=client.post('/api/products',headers=owner,json=payload()).json();pid=product['id']
    original=client.post(f'/api/products/{pid}/photo',headers=owner,json={'photo_data':photo_data()})
    assert original.status_code==200,original.text
    first=original.json()['image_url']
    assert client.post(f'/api/products/{pid}/photo',json={'photo_data':photo_data('blue')}).status_code==401
    assert client.post(f'/api/products/{pid}/photo',headers=other,json={'photo_data':photo_data('blue')}).status_code==403
    assert client.get(f'/api/products/{pid}').json()['image_url']==first
    monkeypatch.setattr(get_settings(),'admin_emails',other_user['email'])
    replaced=client.post(f'/api/products/{pid}/photo',headers=other,json={'photo_data':photo_data('blue')})
    assert replaced.status_code==200,replaced.text
    assert replaced.json()['image_url']!=first and replaced.json()['name']==product['name'] and replaced.json()['sale_unit']==product['sale_unit']
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(ProductPhoto).where(ProductPhoto.product_id==pid))==1
        db.get(Product,pid).is_active=False;db.commit()
    assert client.get(urlsplit(first).path).status_code==404
    with SessionLocal() as db:
        db.execute(delete(ProductPhoto).where(ProductPhoto.product_id==pid));db.execute(delete(Product).where(Product.id==pid));db.commit()


def test_invalid_images_do_not_create_half_registered_products(client):
    owner,_=register_user(client)
    for image in ['data:image/svg+xml;base64,'+base64.b64encode(b'<svg/>').decode(),'data:image/jpeg;base64,not-an-image', 'data:image/jpeg;base64,'+base64.b64encode(b'<html>fake image</html>').decode()]:
        data=payload(image)
        response=client.post('/api/products',headers=owner,json=data)
        assert response.status_code==422,response.text
        with SessionLocal() as db:assert db.scalar(select(Product.id).where(Product.name==data['name'])) is None
    assert client.get('/api/products/999999/photo').status_code==404
