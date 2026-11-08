from datetime import datetime,timedelta,timezone
from decimal import Decimal
from sqlalchemy import select,delete
from conftest import register_user
from app.db.session import SessionLocal
from app.models import Product,Market,Offer,OfferCheck
from app.api.offers import group_offers


def test_grouping_never_merges_different_prices_conditions_or_community_reports():
    now=datetime.now(timezone.utc)
    base=dict(id=1,product_id=1,source_url='https://official.invalid/flyer',source_label='Carone · folheto',price=Decimal('5.99'),conditions='Exige clube',expires_at=now,state='active')
    rows=[base,{**base,'id':2},{**base,'id':3,'price':Decimal('6.99')},{**base,'id':4,'conditions':'Sem clube'},{**base,'id':5,'expires_at':now+timedelta(days=1)},{**base,'id':6,'source_url':None},{**base,'id':7,'source_url':None}]
    grouped=group_offers(rows)
    assert len(grouped)==6
    one=next(row for row in grouped if row['id']==1)
    assert [row['id'] for row in one['related_offers']]==[2]
    assert all(not row['related_offers'] for row in grouped if row['id']!=1)


def test_official_offers_are_grouped_before_cutoff_and_keep_store_checks_separate(client):
    owner,_=register_user(client);viewer,_=register_user(client)
    now=datetime.now(timezone.utc);expiry=now+timedelta(days=1)
    mids=[];oids=[]
    with SessionLocal() as db:
        product=db.scalar(select(Product).order_by(Product.id));pid=product.id
        user_id=client.get('/api/auth/me',headers=owner).json()['id']
        for number in range(107):
            market=Market(name=f'Loja agrupamento {number}',address='Rua de teste',city='Serra' if number!=106 else 'Vitória',state='ES')
            db.add(market);db.flush();mids.append(market.id)
            chain='Carone' if number<2 or number==106 else 'Extrabom'
            # Insert Carone first: all its records would be outside a 100-row cutoff.
            offer=Offer(product_id=pid,market_id=market.id,user_id=user_id,price=Decimal('4.99'),conditions='Clube da rede',observed_at=now,expires_at=expiry,source_url='https://official.invalid/'+chain,source_label=chain+' · folheto oficial')
            db.add(offer);db.flush();oids.append(offer.id)
        db.commit()
    try:
        raw=client.get('/api/offers',headers=viewer,params={'city':'Serra'}).json()
        assert len(raw)==100 and all(row['source_label'].startswith('Extrabom') for row in raw)
        response=client.get('/api/offers',headers=viewer,params={'city':'Serra','grouped':True})
        assert response.status_code==200,response.text
        rows=[r for r in response.json() if (r.get('source_url') or '').startswith('https://official.invalid/')]
        assert len(rows)==2 and {r['source_label'].split(' · ')[0] for r in rows}=={'Carone','Extrabom'}
        flattened=[s for row in rows for s in [row,*row['related_offers']]]
        assert len(flattened)==106 and all(s['market']['city']=='Serra' for s in flattened)
        carone=next(row for row in rows if row['source_label'].startswith('Carone'))
        chosen=carone['related_offers'][0]
        assert client.post(f'/api/offers/{chosen["id"]}/check',headers=viewer,json={'status':'confirmed'}).status_code==200
        fresh=client.get('/api/offers',headers=viewer,params={'city':'Serra','grouped':True}).json()
        allfresh=[s for row in fresh for s in [row,*row['related_offers']]]
        assert next(s for s in allfresh if s['id']==chosen['id'])['confirmations']==1
        assert next(s for s in allfresh if s['id']==carone['id'])['confirmations']==0
        mine=client.get('/api/offers',headers=owner,params={'mine':True,'grouped':True}).json()
        assert all(not row['related_offers'] for row in mine)
    finally:
        with SessionLocal() as db:
            db.execute(delete(OfferCheck).where(OfferCheck.offer_id.in_(oids)));db.execute(delete(Offer).where(Offer.id.in_(oids)));db.execute(delete(Market).where(Market.id.in_(mids)));db.commit()
