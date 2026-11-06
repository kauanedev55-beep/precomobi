from datetime import datetime,timedelta,timezone
from conftest import register_user


def offer(client,headers,pid,mid):
    r=client.post('/api/offers',headers=headers,json={'product_id':pid,'market_id':mid,'price':'5.00','conditions':'Preço para todos os clientes','expires_at':(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()})
    assert r.status_code==201,r.text
    return r.json()


def test_alert_opt_in_habitual_markets_lists_privacy_and_opt_out(client):
    owner,_=register_user(client);contributor,_=register_user(client);other,_=register_user(client)
    products=client.get('/api/products').json()[:2];markets=client.get('/api/markets?city=Serra').json()[:2]
    a=offer(client,contributor,products[0]['id'],markets[0]['id'])
    b=offer(client,contributor,products[1]['id'],markets[1]['id'])
    mine=offer(client,owner,products[0]['id'],markets[0]['id'])
    assert client.get('/api/alert-preferences',headers=owner).json()=={'enabled':False,'scope':'lists','market_ids':[]}
    assert client.get('/api/offers?for_alerts=true',headers=owner).json()==[]
    pref={'enabled':True,'scope':'markets','market_ids':[markets[0]['id']]}
    assert client.put('/api/alert-preferences',headers=owner,json=pref).status_code==200
    rows=client.get('/api/offers?for_alerts=true&city=__none__',headers=owner).json();ids={o['id'] for o in rows}
    assert a['id'] in ids and b['id'] not in ids and mine['id'] not in ids
    assert client.get('/api/alert-preferences',headers=other).json()['market_ids']==[]
    assert client.get('/api/offers?for_alerts=true',headers=other).json()==[]
    saved=client.post('/api/shopping-lists',headers=owner,json={'name':'Minha lista privada','items':[{'product_id':products[1]['id'],'quantity':1}]}).json()
    pref['scope']='lists';assert client.put('/api/alert-preferences',headers=owner,json=pref).status_code==200
    ids={o['id'] for o in client.get('/api/offers?for_alerts=true&city=Serra',headers=owner).json()}
    assert b['id'] in ids and a['id'] not in ids
    assert client.get(f"/api/comparisons/{saved['id']}",headers=other).status_code==404
    assert client.get('/api/price-reports/mine',headers=other).json()==[]
    pref['scope']='both';client.put('/api/alert-preferences',headers=owner,json=pref)
    ids={o['id'] for o in client.get(f"/api/offers?for_alerts=true&city=Serra&product_ids={products[1]['id']}",headers=owner).json()}
    assert {a['id'],b['id']} <= ids and mine['id'] not in ids
    pref['enabled']=False;client.put('/api/alert-preferences',headers=owner,json=pref)
    assert client.get('/api/offers?for_alerts=true',headers=owner).json()==[]
    assert client.get('/api/alert-preferences',headers=owner).json()==pref


def test_alert_preferences_are_authenticated_and_validate_markets(client,demo_headers):
    pref={'enabled':True,'scope':'markets','market_ids':[]}
    assert client.get('/api/alert-preferences').status_code==401
    assert client.put('/api/alert-preferences',json=pref).status_code==401
    assert client.put('/api/alert-preferences',headers=demo_headers,json=pref).status_code==422
    for ids in [[999999],[1,1],[-1]]:
        pref['market_ids']=ids
        assert client.put('/api/alert-preferences',headers=demo_headers,json=pref).status_code==422


def test_alerts_match_unsaved_products_and_remove_expired_ended_offers(client):
    viewer,_=register_user(client);author,_=register_user(client)
    p=client.get('/api/products').json()[0];m=client.get('/api/markets?city=Serra').json()[0]
    o=offer(client,author,p['id'],m['id'])
    assert client.put('/api/alert-preferences',headers=viewer,json={'enabled':True,'scope':'lists','market_ids':[]}).status_code==200
    path=f"/api/offers?for_alerts=true&city=Serra&product_ids={p['id']}"
    assert o['id'] in {x['id'] for x in client.get(path,headers=viewer).json()}
    assert client.post(f"/api/offers/{o['id']}/end",headers=author).status_code==200
    assert o['id'] not in {x['id'] for x in client.get(path,headers=viewer).json()}


def test_alerts_drop_expired_offers_and_inactive_markets(client):
    from app.db.session import SessionLocal
    from app.models import Market
    from app.models.offers import Offer

    viewer,_=register_user(client);author,_=register_user(client)
    p=client.get('/api/products').json()[0]
    m=client.get('/api/markets?city=Serra').json()[0]
    o=offer(client,author,p['id'],m['id'])
    pref={'enabled':True,'scope':'markets','market_ids':[m['id']]}
    assert client.put('/api/alert-preferences',headers=viewer,json=pref).status_code==200
    path='/api/offers?for_alerts=true'
    assert o['id'] in {x['id'] for x in client.get(path,headers=viewer).json()}
    with SessionLocal() as db:
        db.get(Offer,o['id']).expires_at=datetime.now(timezone.utc)-timedelta(seconds=1)
        db.commit()
    assert o['id'] not in {x['id'] for x in client.get(path,headers=viewer).json()}
    with SessionLocal() as db:
        db.get(Offer,o['id']).expires_at=datetime.now(timezone.utc)+timedelta(days=1)
        db.get(Market,m['id']).is_active=False
        db.commit()
    try:
        assert o['id'] not in {x['id'] for x in client.get(path,headers=viewer).json()}
    finally:
        with SessionLocal() as db:
            db.get(Market,m['id']).is_active=True
            db.commit()
