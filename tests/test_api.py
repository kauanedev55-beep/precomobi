"""Testes do comportamento JÁ EXISTENTE da API (nenhuma funcionalidade nova).

Os valores esperados vêm do seed de desenvolvimento (backend/app/db/init_db.py):

    Produto (EAN)                 Carone   Extrabom   Boa Compra
    Arroz     7890000000011       24,90    23,90      25,50
    Feijão    7890000000028        8,90     9,49       8,20
    Leite     7890000000035        5,49     5,29       5,79
    Café      7890000000042       17,90    15,90      16,90
    Macarrão  7890000000059        5,99     6,49       (sem preço)
"""
from datetime import datetime
from decimal import Decimal

from app.db.session import SessionLocal
from app.models import PriceReport, Product

from conftest import register_user

ARROZ = "7890000000011"
FEIJAO = "7890000000028"
LEITE = "7890000000035"
CAFE = "7890000000042"
MACARRAO = "7890000000059"
SEED_EANS = {ARROZ, FEIJAO, LEITE, CAFE, MACARRAO}

CARONE = "Carone Laranjeiras"
EXTRABOM = "Extrabom Colina de Laranjeiras"
BOA_COMPRA = "Supermercados BH Laranjeiras"


# ---------- funções auxiliares ----------

def product_id(client, ean: str) -> int:
    response = client.get("/api/products", params={"ean": ean})
    assert response.status_code == 200, response.text
    return response.json()[0]["id"]


def market_id(client, name: str) -> int:
    markets = client.get("/api/markets").json()
    return next(market["id"] for market in markets if market["name"] == name)


def demo_auth(client):
    r = client.post("/api/auth/login", json={"email": "demo@precomobi.local", "password": "precomobi123"})
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def create_list(client, items, name: str = "Lista de teste") -> dict:
    payload = {"name": name, "items": [{"product_id": pid, "quantity": qty} for pid, qty in items]}
    response = client.post("/api/shopping-lists", json=payload, headers=demo_auth(client))
    assert response.status_code == 201, response.text
    return response.json()


def compare(client, list_id: int) -> dict:
    response = client.get(f"/api/comparisons/{list_id}", headers=demo_auth(client))
    assert response.status_code == 200, response.text
    return response.json()


def result_for(comparison: dict, market_name: str) -> dict:
    return next(result for result in comparison["results"] if result["market_name"] == market_name)


# ---------- saúde da API ----------

def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "precomobi-api"}


def test_health_database(client):
    response = client.get("/api/health/database")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"


# ---------- produtos e EAN ----------

def test_list_products_contains_seed(client):
    response = client.get("/api/products")
    assert response.status_code == 200
    products = response.json()
    assert SEED_EANS <= {product["ean"] for product in products}
    assert all(product["name"] for product in products)


def test_search_by_ean_found(client):
    response = client.get("/api/products", params={"ean": ARROZ})
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 1
    assert products[0]["name"] == "Arroz Camil 5 kg"
    assert products[0]["ean"] == ARROZ


def test_search_by_ean_not_found_returns_404(client):
    response = client.get("/api/products", params={"ean": "0000000000000"})
    assert response.status_code == 404
    assert "EAN" in response.json()["detail"]


# ---------- mercados ----------

def test_list_markets(client):
    response = client.get("/api/markets")
    assert response.status_code == 200
    markets = response.json()
    assert {CARONE, EXTRABOM, BOA_COMPRA} <= {market["name"] for market in markets}
    assert all(market["city"] == "Serra" and market["state"] == "ES" for market in markets)


# ---------- listas de compras ----------

def test_create_shopping_list(client):
    arroz = product_id(client, ARROZ)
    created = create_list(client, [(arroz, 2)], name="Minha lista")
    assert created["name"] == "Minha lista"
    assert len(created["items"]) == 1
    assert Decimal(created["items"][0]["quantity"]) == Decimal("2")
    assert created["items"][0]["product"]["name"] == "Arroz Camil 5 kg"


def test_create_shopping_list_with_unknown_product_returns_404(client):
    response = client.post(
        "/api/shopping-lists", headers=demo_auth(client),
        json={"name": "Lista inválida", "items": [{"product_id": 999999, "quantity": 1}]},
    )
    assert response.status_code == 404


def test_create_shopping_list_rejects_invalid_payload(client):
    arroz = product_id(client, ARROZ)
    zero_quantity = client.post(
        "/api/shopping-lists", headers=demo_auth(client), json={"name": "Lista", "items": [{"product_id": arroz, "quantity": 0}]}
    )
    empty_name = client.post("/api/shopping-lists", headers=demo_auth(client), json={"name": "", "items": []})
    assert zero_quantity.status_code == 422
    assert empty_name.status_code == 422


def test_get_shopping_list_by_id(client):
    created = create_list(client, [(product_id(client, LEITE), 3)])
    response = client.get(f"/api/shopping-lists/{created['id']}", headers=demo_auth(client))
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_unknown_shopping_list_returns_404(client):
    assert client.get("/api/shopping-lists/999999", headers=demo_auth(client)).status_code == 404


# ---------- comparação ----------

def test_comparison_complete_markets_sorted_by_total(client):
    # Arroz x1 + Feijão x2
    #   Carone:     24,90 + 2 x 8,90 = 42,70
    #   Extrabom:   23,90 + 2 x 9,49 = 42,88
    #   Boa Compra: 25,50 + 2 x 8,20 = 41,90
    created = create_list(client, [(product_id(client, ARROZ), 1), (product_id(client, FEIJAO), 2)])
    comparison = compare(client, created["id"])

    assert [result["market_name"] for result in comparison["results"]] == [BOA_COMPRA, CARONE, EXTRABOM]
    assert all(result["complete"] for result in comparison["results"])
    assert Decimal(result_for(comparison, BOA_COMPRA)["total"]) == Decimal("41.90")
    assert Decimal(result_for(comparison, CARONE)["total"]) == Decimal("42.70")
    assert Decimal(result_for(comparison, EXTRABOM)["total"]) == Decimal("42.88")

    first_item = result_for(comparison, CARONE)["items"][0]
    assert Decimal(first_item["unit_price"]) == Decimal("24.90")
    assert Decimal(first_item["subtotal"]) == Decimal("24.90")


def test_comparison_partial_market_has_no_total_and_comes_last(client):
    # Arroz x1 + Macarrão x1  (Boa Compra não tem preço de Macarrão)
    #   Extrabom: 23,90 + 6,49 = 30,39
    #   Carone:   24,90 + 5,99 = 30,89
    created = create_list(client, [(product_id(client, ARROZ), 1), (product_id(client, MACARRAO), 1)])
    comparison = compare(client, created["id"])

    assert [result["market_name"] for result in comparison["results"]] == [EXTRABOM, CARONE, BOA_COMPRA]

    partial = result_for(comparison, BOA_COMPRA)
    assert partial["complete"] is False
    assert partial["total"] is None
    assert partial["found_items"] == 1
    assert partial["total_items"] == 2
    missing = next(item for item in partial["items"] if item["product_name"].startswith("Macarr"))
    assert missing["unit_price"] is None
    assert missing["subtotal"] is None


def test_comparison_of_unknown_list_returns_404(client):
    assert client.get("/api/comparisons/999999", headers=demo_auth(client)).status_code == 404


def test_comparison_items_expose_source_type(client):
    created = create_list(client, [(product_id(client, ARROZ), 1)])
    comparison = compare(client, created["id"])
    carone_item = result_for(comparison, CARONE)["items"][0]
    assert carone_item["source_type"] == "development"


# ---------- autenticação ----------

def test_register_creates_user_and_returns_token(client):
    headers, user = register_user(client, name="Nova Usuária")
    assert user["name"] == "Nova Usuária"
    assert "access_token" not in user  # o token vem fora do objeto "user"
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == user["email"]


def test_register_duplicate_email_returns_409(client):
    _, user = register_user(client)
    response = client.post(
        "/api/auth/register",
        json={"name": "Outra pessoa", "email": user["email"], "password": "outrasenha123"},
    )
    assert response.status_code == 409


def test_login_with_correct_password(client):
    email = "login-teste@teste.local"
    register_user(client, name="Teste Login", email=email, password="minhasenha123")
    response = client.post("/api/auth/login", json={"email": email, "password": "minhasenha123"})
    assert response.status_code == 200
    assert response.json()["user"]["email"] == email


def test_login_with_wrong_password_returns_401(client):
    email = "login-errado@teste.local"
    client.post("/api/auth/register", json={"name": "Teste", "email": email, "password": "senhacerta123"})
    response = client.post("/api/auth/login", json={"email": email, "password": "senhaerrada"})
    assert response.status_code == 401


def test_demo_user_can_login(client):
    """A conta de demonstração do seed precisa continuar logável (senha: precomobi123)."""
    response = client.post(
        "/api/auth/login", json={"email": "demo@precomobi.local", "password": "precomobi123"}
    )
    assert response.status_code == 200


def test_me_without_token_returns_401(client):
    assert client.get("/api/auth/me").status_code == 401


def test_authenticated_user_only_sees_own_shopping_lists(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)

    arroz = product_id(client, ARROZ)
    list_a = client.post(
        "/api/shopping-lists", json={"name": "Lista da usuária A", "items": [{"product_id": arroz, "quantity": 1}]},
        headers=headers_a,
    ).json()

    lists_of_b = client.get("/api/shopping-lists", headers=headers_b).json()
    assert list_a["id"] not in [item["id"] for item in lists_of_b]

    lists_of_a = client.get("/api/shopping-lists", headers=headers_a).json()
    assert list_a["id"] in [item["id"] for item in lists_of_a]


def test_get_shopping_list_of_another_user_returns_404(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)
    arroz = product_id(client, ARROZ)
    list_a = client.post(
        "/api/shopping-lists", json={"name": "Lista privada", "items": [{"product_id": arroz, "quantity": 1}]},
        headers=headers_a,
    ).json()

    response = client.get(f"/api/shopping-lists/{list_a['id']}", headers=headers_b)
    assert response.status_code == 404


def test_comparison_uses_latest_active_price_per_market(client):
    """Preço mais recente vence (pela data, não pelo id) e registros inativos são ignorados."""
    carone = market_id(client, CARONE)

    with SessionLocal() as db:
        product = Product(ean="0000000000017", name="Produto de teste de histórico")
        db.add(product)
        db.flush()
        new_product_id = product.id
        db.add_all([
            # inserido primeiro, mas é o mais recente entre os ativos
            PriceReport(product_id=new_product_id, market_id=carone, price=Decimal("12.00"),
                        reported_at=datetime(2026, 2, 1), source_type="development"),
            # mais antigo
            PriceReport(product_id=new_product_id, market_id=carone, price=Decimal("10.00"),
                        reported_at=datetime(2026, 1, 1), source_type="development"),
            # mais novo de todos, porém inativo: deve ser ignorado
            PriceReport(product_id=new_product_id, market_id=carone, price=Decimal("99.00"),
                        reported_at=datetime(2026, 3, 1), source_type="development", is_active=False),
        ])
        db.commit()

    created = create_list(client, [(new_product_id, 1)])
    comparison = compare(client, created["id"])

    carone_result = result_for(comparison, CARONE)
    assert carone_result["complete"] is True
    assert Decimal(carone_result["items"][0]["unit_price"]) == Decimal("12.00")
    assert Decimal(carone_result["total"]) == Decimal("12.00")
    # os outros mercados não têm preço desse produto
    assert result_for(comparison, EXTRABOM)["complete"] is False
    assert result_for(comparison, BOA_COMPRA)["complete"] is False
    assert comparison["results"][0]["market_name"] == CARONE


# ---------- busca por nome e detalhe do produto ----------

def test_search_products_by_name(client):
    response = client.get("/api/products", params={"q": "arroz"})
    assert response.status_code == 200
    names = [product["name"] for product in response.json()]
    assert names and all("arroz" in name.lower() for name in names)


def test_search_products_by_name_without_results_returns_empty_list(client):
    response = client.get("/api/products", params={"q": "produto-que-nao-existe-xyz"})
    assert response.status_code == 200
    assert response.json() == []


def test_product_detail_shows_latest_price_per_market_with_source(client):
    detail = client.get(f"/api/products/{product_id(client, ARROZ)}").json()
    assert detail["ean"] == ARROZ
    prices = {price["market_name"]: price for price in detail["prices"]}
    assert set(prices) >= {CARONE, EXTRABOM, BOA_COMPRA}
    assert Decimal(prices[CARONE]["price"]) == Decimal("24.90")
    assert prices[CARONE]["source_type"] == "development"


def test_product_detail_market_without_price_is_null(client):
    detail = client.get(f"/api/products/{product_id(client, MACARRAO)}").json()
    boa_compra = next(price for price in detail["prices"] if price["market_name"] == BOA_COMPRA)
    assert boa_compra["price"] is None
    assert boa_compra["source_type"] is None


def test_product_detail_unknown_returns_404(client):
    assert client.get("/api/products/999999").status_code == 404


# ---------- contribuição de preços, histórico e minhas contribuições ----------

def new_product(name: str, ean: str) -> int:
    with SessionLocal() as db:
        product = Product(ean=ean, name=name)
        db.add(product)
        db.commit()
        return product.id


def contribute(client, headers, product, market, price, **extra):
    payload = {"product_id": product, "market_id": market, "price": price, **extra}
    return client.post("/api/price-reports", json=payload, headers=headers)


def test_contribute_price_requires_login(client):
    response = contribute(client, {}, product_id(client, ARROZ), market_id(client, CARONE), "10.00")
    assert response.status_code == 401


def test_contribute_price_creates_community_report(client):
    headers, user = register_user(client)
    product = new_product("Produto contribuição A", "0000000000024")
    response = contribute(client, headers, product, market_id(client, CARONE), "7.45", notes="Vi na prateleira")
    assert response.status_code == 201
    body = response.json()
    assert body["source_type"] == "community"
    assert Decimal(body["price"]) == Decimal("7.45")
    assert body["notes"] == "Vi na prateleira"
    assert body["market_name"] == CARONE


def test_contribution_keeps_history_and_becomes_latest_price(client):
    headers, _ = register_user(client)
    product = new_product("Produto contribuição B", "0000000000031")
    carone = market_id(client, CARONE)
    contribute(client, headers, product, carone, "5.00", observed_at="2026-01-10T12:00:00Z")
    contribute(client, headers, product, carone, "6.00", observed_at="2026-02-10T12:00:00Z")

    history = client.get("/api/price-reports", params={"product_id": product}).json()
    assert [Decimal(item["price"]) for item in history] == [Decimal("6.00"), Decimal("5.00")]  # nada foi apagado

    created = create_list(client, [(product, 1)])
    comparison = compare(client, created["id"])
    item = result_for(comparison, CARONE)["items"][0]
    assert Decimal(item["unit_price"]) == Decimal("6.00")
    assert item["source_type"] == "community"


def test_contribution_validations(client):
    headers, _ = register_user(client)
    product = new_product("Produto contribuição C", "0000000000048")
    carone = market_id(client, CARONE)
    assert contribute(client, headers, product, carone, "0").status_code == 422
    assert contribute(client, headers, product, carone, "-3.50").status_code == 422
    assert contribute(client, headers, product, carone, "5.00", observed_at="2999-01-01T00:00:00Z").status_code == 422
    assert contribute(client, headers, 999999, carone, "5.00").status_code == 404
    assert contribute(client, headers, product, 999999, "5.00").status_code == 404


def test_my_contributions_only_returns_own(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)
    product = new_product("Produto contribuição D", "0000000000055")
    carone = market_id(client, CARONE)
    contribute(client, headers_a, product, carone, "3.10")
    contribute(client, headers_b, product, carone, "3.20")

    mine_a = client.get("/api/price-reports/mine", headers=headers_a).json()
    assert [Decimal(item["price"]) for item in mine_a] == [Decimal("3.10")]
    assert client.get("/api/price-reports/mine").status_code == 401


def test_price_history_can_filter_by_market(client):
    headers, _ = register_user(client)
    product = new_product("Produto contribuição E", "0000000000062")
    contribute(client, headers, product, market_id(client, CARONE), "1.00")
    contribute(client, headers, product, market_id(client, EXTRABOM), "2.00")
    only_extrabom = client.get(
        "/api/price-reports", params={"product_id": product, "market_id": market_id(client, EXTRABOM)}
    ).json()
    assert [item["market_name"] for item in only_extrabom] == [EXTRABOM]


# ---------- excluir lista ----------

def test_delete_own_shopping_list(client):
    headers, _ = register_user(client)
    created = client.post(
        "/api/shopping-lists",
        json={"name": "Para excluir", "items": [{"product_id": product_id(client, ARROZ), "quantity": 1}]},
        headers=headers,
    ).json()
    assert client.delete(f"/api/shopping-lists/{created['id']}", headers=headers).status_code == 204
    assert client.get(f"/api/shopping-lists/{created['id']}", headers=headers).status_code == 404


def test_cannot_delete_list_of_another_user(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)
    created = client.post(
        "/api/shopping-lists",
        json={"name": "Lista da A", "items": [{"product_id": product_id(client, ARROZ), "quantity": 1}]},
        headers=headers_a,
    ).json()
    assert client.delete(f"/api/shopping-lists/{created['id']}", headers=headers_b).status_code == 404
    assert client.delete(f"/api/shopping-lists/{created['id']}").status_code == 401
    assert client.get(f"/api/shopping-lists/{created['id']}", headers=headers_a).status_code == 200


def test_cannot_compare_list_of_another_user(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)
    created = client.post(
        "/api/shopping-lists",
        json={"name": "Lista privada", "items": [{"product_id": product_id(client, ARROZ), "quantity": 1}]},
        headers=headers_a,
    ).json()
    assert client.get(f"/api/comparisons/{created['id']}", headers=headers_a).status_code == 200
    assert client.get(f"/api/comparisons/{created['id']}", headers=headers_b).status_code == 404


# ---------- e-mail de boas-vindas ----------

def test_send_welcome_email_is_noop_without_brevo_configured():
    from app.core.email import send_welcome_email

    assert send_welcome_email("alguem@teste.local", "Alguém") is False


def test_register_unavailable_without_email(client, monkeypatch):
    monkeypatch.setattr("app.api.auth.configured", lambda: False)
    response = client.post("/api/auth/register", json={"name": "Teste", "email": "no-smtp@teste.local", "password": "senha12345"})
    assert response.status_code == 503


def test_markets_have_real_coordinates(client):
    markets = client.get("/api/markets").json()
    by_name = {market["name"]: market for market in markets}
    assert set(by_name) >= {CARONE, EXTRABOM, BOA_COMPRA}
    for name in (CARONE, EXTRABOM, BOA_COMPRA):
        assert by_name[name]["latitude"] is not None
        assert by_name[name]["longitude"] is not None
        # todos devem estar na região de Serra/ES (evita erro grosseiro de digitação)
        assert -20.3 < float(by_name[name]["latitude"]) < -20.1
        assert -40.4 < float(by_name[name]["longitude"]) < -40.2


def test_product_list_shows_cheapest_price(client):
    products = client.get("/api/products", params={"q": "arroz"}).json()
    arroz = next(product for product in products if product["ean"] == ARROZ)
    assert Decimal(arroz["min_price"]) == Decimal("23.90")
    assert arroz["min_price_market"] == EXTRABOM


def test_product_list_without_price_has_null_min_price(client):
    ean = "0000000000079"
    with SessionLocal() as db:
        db.add(Product(ean=ean, name="Produto sem preço nenhum"))
        db.commit()
    products = client.get("/api/products", params={"q": "Produto sem preço nenhum"}).json()
    assert products[0]["min_price"] is None
    assert products[0]["min_price_market"] is None


# ---------- confirmação de preços ----------

def test_confirm_price_report_requires_login(client):
    headers, _ = register_user(client)
    product = new_product("Produto confirmação A", "0000000000123")
    report = contribute(client, headers, product, market_id(client, CARONE), "9.90").json()
    assert client.post(f"/api/price-reports/{report['id']}/confirm").status_code == 401


def test_confirm_price_report_increments_count(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)
    product = new_product("Produto confirmação B", "0000000000086")
    report = contribute(client, headers_a, product, market_id(client, CARONE), "9.90").json()
    assert report["confirmations_count"] == 0
    assert report["confirmed_by_me"] is False

    response = client.post(f"/api/price-reports/{report['id']}/confirm", headers=headers_b)
    assert response.status_code == 201
    body = response.json()
    assert body["confirmations_count"] == 1
    assert body["confirmed_by_me"] is True

    # aparece também pra quem vê o histórico depois
    history = client.get("/api/price-reports", params={"product_id": product}, headers=headers_b).json()
    assert history[0]["confirmations_count"] == 1
    assert history[0]["confirmed_by_me"] is True


def test_cannot_confirm_own_price_report(client):
    headers, _ = register_user(client)
    product = new_product("Produto confirmação C", "0000000000093")
    report = contribute(client, headers, product, market_id(client, CARONE), "9.90").json()
    response = client.post(f"/api/price-reports/{report['id']}/confirm", headers=headers)
    assert response.status_code == 400


def test_cannot_confirm_same_price_report_twice(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)
    product = new_product("Produto confirmação D", "0000000000109")
    report = contribute(client, headers_a, product, market_id(client, CARONE), "9.90").json()
    first = client.post(f"/api/price-reports/{report['id']}/confirm", headers=headers_b)
    second = client.post(f"/api/price-reports/{report['id']}/confirm", headers=headers_b)
    assert first.status_code == 201
    assert second.status_code == 409


def test_confirm_unknown_price_report_returns_404(client):
    headers, _ = register_user(client)
    assert client.post("/api/price-reports/999999/confirm", headers=headers).status_code == 404


def test_product_detail_exposes_confirmation_count(client):
    headers_a, _ = register_user(client)
    headers_b, _ = register_user(client)
    product = new_product("Produto confirmação E", "0000000000116")
    carone = market_id(client, CARONE)
    report = contribute(client, headers_a, product, carone, "9.90").json()
    client.post(f"/api/price-reports/{report['id']}/confirm", headers=headers_b)

    detail = client.get(f"/api/products/{product}", headers=headers_b).json()
    price = next(p for p in detail["prices"] if p["market_name"] == CARONE)
    assert price["report_id"] == report["id"]
    assert price["confirmations_count"] == 1
    assert price["confirmed_by_me"] is True
