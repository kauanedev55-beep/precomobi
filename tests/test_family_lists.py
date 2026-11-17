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


def test_list_can_be_invited_during_preparation_and_after_completion(client):
    owner,member,stranger,p,row=setup_family(client)
    endpoint=f'/api/family-lists/{row["id"]}'
    # A freshly saved draft can be shared immediately, without another save.
    assert row['status']=='preparation'
    first=client.post(endpoint+'/invite',headers=owner)
    assert first.status_code==200
    joined=client.post(f'/api/family-lists/invites/{first.json()["token"]}/accept',headers=member)
    assert joined.status_code==200
    assert joined.json()['list']['items'][0]['product_id']==p['id']
    marked=client.patch(endpoint+'/items',headers=member,json={'revision':row['revision'],'product_id':p['id'],'action':'check','is_purchased':True})
    assert marked.status_code==200
    finished=client.patch(endpoint,headers=owner,json={'revision':marked.json()['list']['revision'],'status':'completed'})
    assert finished.status_code==200
    # Sharing a completed list does not reopen it or discard shopping progress.
    second=client.post(endpoint+'/invite',headers=owner)
    assert second.status_code==200
    assert client.get(endpoint,headers=stranger).status_code==404
    accepted=client.post(f'/api/family-lists/invites/{second.json()["token"]}/accept',headers=stranger)
    assert accepted.status_code==200
    final=accepted.json()['list']
    assert final['id']==row['id'] and final['status']=='completed'
    assert final['items'][0]['is_purchased'] is True
    assert client.patch(endpoint+'/items',headers=stranger,json={'revision':final['revision'],'product_id':p['id'],'action':'remove'}).status_code==409


def test_creator_app_endpoints_show_recipient_checks_without_reopening_invite(client):
    owner,member,_,p,row=setup_family(client)
    lid=row['id'];endpoint=f'/api/family-lists/{lid}'
    token=client.post(endpoint+'/invite',headers=owner).json()['token']
    assert client.post(f'/api/family-lists/invites/{token}/accept',headers=member).status_code==200
    marked=client.patch(endpoint+'/items',headers=member,json={'revision':row['revision'],'product_id':p['id'],'action':'check','is_purchased':True})
    assert marked.status_code==200
    # Normal app list/card reads show progress; the invitation URL is not read again.
    card=next(r for r in client.get('/api/shopping-lists',headers=owner).json() if r['id']==lid)
    current=client.get(endpoint,headers=owner).json()['list']
    assert card['items'][0]['is_purchased'] is True
    assert current['items'][0]['is_purchased'] is True
    assert current['revision']==marked.json()['list']['revision']
    cleared=client.patch(endpoint+'/items',headers=member,json={'revision':current['revision'],'product_id':p['id'],'action':'check','is_purchased':False})
    assert cleared.status_code==200
    assert client.get(endpoint,headers=owner).json()['list']['items'][0]['is_purchased'] is False
