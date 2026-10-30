"""Two-account regression: shared prices never become another user's lists."""
from app.core.config import get_settings
from conftest import register_user


def test_shared_prices_private_contributions_and_lists(client, monkeypatch):
    monkeypatch.setattr(get_settings(), 'demo_mode', False)
    a, user_a = register_user(client)
    b, user_b = register_user(client)
    product = client.get('/api/products').json()[0]
    market = client.get('/api/markets').json()[0]

    def report(headers, price):
        r = client.post('/api/price-reports', headers=headers, json={
            'product_id': product['id'], 'market_id': market['id'], 'price': price,
            'notes': 'Preço na prateleira',
        })
        assert r.status_code == 201
        assert r.json()['is_mine'] is True
        return r.json()['id']

    report_a = report(a, '4.25')
    report_b = report(b, '4.50')
    list_response = client.post('/api/shopping-lists', headers=a, json={
        'name': 'Lista privada da conta A',
        'items': [{'product_id': product['id'], 'quantity': 2}],
    })
    assert list_response.status_code == 201
    list_a = list_response.json()['id']

    for headers, own, other in [(a, report_a, report_b), (b, report_b, report_a)]:
        mine = client.get('/api/price-reports/mine', headers=headers).json()
        assert [r['id'] for r in mine] == [own]
        assert all(r['is_mine'] for r in mine)
        community = client.get('/api/price-reports', headers=headers).json()
        by_id = {r['id']: r for r in community}
        assert by_id[own]['is_mine'] is True
        assert by_id[other]['is_mine'] is False
        for r in community:
            assert not {'user_id', 'email', 'user', 'shopping_list_id', 'password_hash'} & r.keys()
        assert client.post(f'/api/price-reports/{own}/confirm', headers=headers).status_code == 400

    assert client.get('/api/shopping-lists', headers=b).json() == []
    assert list_a in [r['id'] for r in client.get('/api/shopping-lists', headers=a).json()]
    assert client.get(f'/api/shopping-lists/{list_a}', headers=b).status_code == 404
    assert client.get(f'/api/comparisons/{list_a}', headers=b).status_code == 404
    assert client.delete(f'/api/shopping-lists/{list_a}', headers=b).status_code == 404

    confirmed = client.post(f'/api/price-reports/{report_a}/confirm', headers=b)
    assert confirmed.status_code == 201
    assert confirmed.json()['confirmed_by_me'] is True
    assert confirmed.json()['is_mine'] is False
    assert client.post(f'/api/price-reports/{report_a}/confirm', headers=b).status_code == 409
    mine_a = client.get('/api/price-reports/mine', headers=a).json()
    assert mine_a[0]['confirmations_count'] == 1
    assert client.get('/api/price-reports/mine', headers=b).json()[0]['id'] == report_b

    # The newest observation belongs to B in the product view as well.
    for headers, own in [(a, False), (b, True)]:
        detail = client.get(f"/api/products/{product['id']}", headers=headers).json()
        price = next(p for p in detail['prices'] if p['market_id'] == market['id'])
        assert price['is_mine'] is own
    public = client.get('/api/price-reports').json()
    assert all(r['is_mine'] is False and r['confirmed_by_me'] is False for r in public)
    assert client.get('/api/price-reports/mine').status_code == 401
