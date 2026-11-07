from conftest import register_user


def test_list_only_use_saves_picked_items_without_city_or_price_comparison(client):
    owner,_=register_user(client)
    other,_=register_user(client)
    products=client.get('/api/products',params={'external':False}).json()
    first,second=products[0]['id'],products[1]['id']
    payload={'name':'Minha lista sem mercado','items':[{'product_id':first,'quantity':2,'is_purchased':True},{'product_id':second,'quantity':1}]}
    created=client.post('/api/shopping-lists',headers=owner,json=payload)
    assert created.status_code==201,created.text
    lid=created.json()['id']
    items={item['product_id']:item for item in created.json()['items']}
    assert items[first]['is_purchased'] is True and items[second]['is_purchased'] is False
    assert client.get(f'/api/shopping-lists/{lid}',headers=other).status_code==404
    before=client.get('/api/shopping-lists',headers=owner).json()
    update={'name':'Lista atualizada','items':[{'product_id':second,'quantity':3,'is_purchased':True}]}
    denied=client.put(f'/api/shopping-lists/{lid}',headers=other,json=update)
    assert denied.status_code==404
    assert client.get(f'/api/shopping-lists/{lid}',headers=owner).json()['name']==payload['name']
    response=client.put(f'/api/shopping-lists/{lid}',headers=owner,json=update)
    assert response.status_code==200,response.text
    saved=response.json()
    assert saved['id']==lid and saved['name']=='Lista atualizada'
    assert len(saved['items'])==1 and saved['items'][0]['product_id']==second
    assert float(saved['items'][0]['quantity'])==3 and saved['items'][0]['is_purchased'] is True
    assert len(client.get('/api/shopping-lists',headers=owner).json())==len(before)
    assert client.get('/api/shopping-lists',headers=other).json()==[]
    missing={'name':'Não pode alterar','items':[{'product_id':999999999,'quantity':1}]}
    assert client.put(f'/api/shopping-lists/{lid}',headers=owner,json=missing).status_code==404
    assert client.get(f'/api/shopping-lists/{lid}',headers=owner).json()==saved
    assert client.put(f'/api/shopping-lists/{lid}',headers=owner,json={'name':'Inválida','items':[]}).status_code==422
    assert client.put(f'/api/shopping-lists/{lid}',json=update).status_code==401
