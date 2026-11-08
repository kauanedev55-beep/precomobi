from datetime import datetime,timedelta,timezone
from sqlalchemy import select
from conftest import register_user
from app.models.family import ListInvite
from app.db.session import SessionLocal


def setup_family(client):
    owner,_=register_user(client);member,_=register_user(client);stranger,_=register_user(client)
    p=client.get('/api/products',params={'external':False}).json()[0]
    created=client.post('/api/shopping-lists',headers=owner,json={'name':'Compras da família','items':[{'product_id':p['id'],'quantity':1}]}).json()
    return owner,member,stranger,p,created


def test_explicit_invitation_membership_isolation_and_revocation(client):
    owner,member,stranger,p,row=setup_family(client);lid=row['id']
    assert client.get(f'/api/family-lists/{lid}',headers=member).status_code==404
    invite=client.post(f'/api/family-lists/{lid}/invite',headers=owner).json();token=invite['token']
    assert client.get(f'/api/family-lists/invites/{token}').status_code==401
    preview=client.get(f'/api/family-lists/invites/{token}',headers=member).json()
    assert preview['name']==row['name'] and 'items' not in preview
    assert client.get(f'/api/family-lists/{lid}',headers=member).status_code==404
    assert client.post(f'/api/family-lists/invites/{token}/accept',headers=member).status_code==200
    assert client.post(f'/api/family-lists/invites/{token}/accept',headers=member).status_code==200
    data=client.get(f'/api/family-lists/{lid}',headers=member).json()
    assert len(data['participants'])==2 and not data['is_owner']
    assert lid in [r['id'] for r in client.get('/api/shopping-lists',headers=member).json()]
    assert client.get(f'/api/shopping-lists/{lid}',headers=stranger).status_code==404
    assert client.get(f'/api/comparisons/{lid}?city=Serra',headers=member).status_code==200
    assert client.post(f'/api/family-lists/{lid}/invite',headers=member).status_code==404
    assert client.delete(f'/api/shopping-lists/{lid}',headers=member).status_code==404
    assert client.delete(f'/api/family-lists/{lid}/members/{data["participants"][0]["id"]}',headers=stranger).status_code==404
    member_id=next(person['id'] for person in data['participants'] if not person['owner'])
    assert client.delete(f'/api/family-lists/{lid}/members/{member_id}',headers=owner).status_code==204
    assert client.get(f'/api/family-lists/{lid}',headers=member).status_code==404
    assert client.post(f'/api/family-lists/invites/{token}/accept',headers=member).status_code==404


def test_revisions_reject_lost_updates_and_completion_requires_pending_choice(client):
    owner,member,stranger,p,row=setup_family(client);lid=row['id'];rev=row['revision']
    token=client.post(f'/api/family-lists/{lid}/invite',headers=owner).json()['token']
    client.post(f'/api/family-lists/invites/{token}/accept',headers=member)
    endpoint=f'/api/family-lists/{lid}'
    rename=client.patch(endpoint,headers=owner,json={'revision':rev,'name':'Churrasco de domingo'}).json()
    assert rename['list']['revision']==rev+1
    stale=client.patch(endpoint+'/items',headers=member,json={'revision':rev,'product_id':p['id'],'action':'check','is_purchased':True})
    assert stale.status_code==409
    revision=rename['list']['revision']
    assert client.patch(endpoint,headers=member,json={'revision':revision,'status':'completed'}).status_code==409
    result=client.patch(endpoint,headers=member,json={'revision':revision,'status':'completed','complete_with_pending':True}).json()
    assert result['list']['status']=='completed' and not result['list']['items'][0]['is_purchased']
    revision=result['list']['revision']
    assert client.patch(endpoint+'/items',headers=member,json={'revision':revision,'product_id':p['id'],'action':'remove'}).status_code==409
    reopened=client.patch(endpoint,headers=member,json={'revision':revision,'status':'shopping'}).json()
    marked=client.patch(endpoint+'/items',headers=member,json={'revision':reopened['list']['revision'],'product_id':p['id'],'action':'check','is_purchased':True}).json()
    finished=client.patch(endpoint,headers=member,json={'revision':marked['list']['revision'],'status':'completed'}).json()
    assert finished['list']['status']=='completed' and finished['list']['items'][0]['is_purchased']
    assert client.patch(endpoint,headers=stranger,json={'revision':finished['list']['revision'],'status':'shopping'}).status_code==404


def test_expired_invite_and_repeated_full_save_cannot_overwrite_shared_changes(client):
    owner,member,_,p,row=setup_family(client);lid=row['id']
    token=client.post(f'/api/family-lists/{lid}/invite',headers=owner).json()['token']
    with SessionLocal() as db:
        invite=db.scalar(select(ListInvite).where(ListInvite.list_id==lid))
        assert invite.token_hash!=token and len(invite.token_hash)==64
        invite.expires_at=datetime.now(timezone.utc)-timedelta(days=1);db.commit()
    assert client.post(f'/api/family-lists/invites/{token}/accept',headers=member).status_code==404
    token=client.post(f'/api/family-lists/{lid}/invite',headers=owner).json()['token']
    client.post(f'/api/family-lists/invites/{token}/accept',headers=member)
    payload={'name':'Não sobrescrever','items':[{'product_id':p['id'],'quantity':5}]}
    assert client.put(f'/api/shopping-lists/{lid}',headers=owner,json=payload).status_code==409
    changed=client.patch(f'/api/family-lists/{lid}/items',headers=member,json={'revision':row['revision'],'product_id':p['id'],'action':'add','quantity':2}).json()
    assert float(changed['list']['items'][0]['quantity'])==3
    payload['revision']=row['revision']
    assert client.put(f'/api/shopping-lists/{lid}',headers=owner,json=payload).status_code==409
    assert float(client.get(f'/api/shopping-lists/{lid}',headers=owner).json()['items'][0]['quantity'])==3
    assert client.delete(f'/api/family-lists/{lid}/invites',headers=owner).status_code==204
    assert client.get(f'/api/family-lists/invites/{token}',headers=member).status_code==404
