from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine
from app.models import Market, PriceReport, Product, User
from app.core.security import hash_password, is_bcrypt_hash

DEMO_PASSWORD = "precomobi123"  # senha da conta de demonstração, só para testar login


PRODUCTS = [
    ("7890000000011", "Arroz Camil 5 kg", "Camil", "Grãos", Decimal("5"), "kg"),
    ("7890000000028", "Feijão Kicaldo 1 kg", "Kicaldo", "Grãos", Decimal("1"), "kg"),
    ("7890000000035", "Leite Integral 1 L", "Italac", "Laticínios", Decimal("1"), "L"),
    ("7890000000042", "Café Tradicional 500 g", "Pilão", "Bebidas", Decimal("500"), "g"),
    ("7890000000059", "Macarrão Espaguete 500 g", "Adria", "Massas", Decimal("500"), "g"),
]

# Mercados reais de Serra/ES (nome, endereço, bairro). Sem latitude/longitude ainda:
# essa parte só é preenchida quando confirmarmos as coordenadas reais de cada loja
# (ver MARKET_COORDINATES mais abaixo) — o projeto não inventa localização.
MARKETS = [
    ("Carone Laranjeiras", "Av. Eldes Scherrer Souza, 1996", "Parque Residencial Laranjeiras"),
    ("Extrabom Colina de Laranjeiras", "Av. Braúna, 1168", "Colina de Laranjeiras"),
    ("Supermercados BH Laranjeiras", "Av. Eldes Scherrer Souza, 2400", "Colina de Laranjeiras"),
]

# Nomes antigos (dados de desenvolvimento fictícios) -> nomes/endereços reais atuais.
# Usado só para corrigir um banco que já existia antes dessa troca, sem apagar histórico.
MARKET_RENAMES = {
    "Carone Serra": MARKETS[0],
    "Extrabom Serra": MARKETS[1],
    "Mercado Boa Compra": MARKETS[2],
}

# Preencha aqui quando tiver a latitude/longitude real de cada loja (ex.: tirada do
# Google Maps) e rode a API de novo — o init_db atualiza sozinho, sem apagar nada.
MARKET_COORDINATES: dict[str, tuple[Decimal, Decimal]] = {
    "Extrabom Colina de Laranjeiras": (Decimal("-20.189504"), Decimal("-40.262079")),
    "Supermercados BH Laranjeiras": (Decimal("-20.193333"), Decimal("-40.267667")),
    "Carone Laranjeiras": (Decimal("-20.192762"), Decimal("-40.265356")),
}

PRICES = [
    (0, 0, Decimal("24.90")), (0, 1, Decimal("23.90")), (0, 2, Decimal("25.50")),
    (1, 0, Decimal("8.90")), (1, 1, Decimal("9.49")), (1, 2, Decimal("8.20")),
    (2, 0, Decimal("5.49")), (2, 1, Decimal("5.29")), (2, 2, Decimal("5.79")),
    (3, 0, Decimal("17.90")), (3, 1, Decimal("15.90")), (3, 2, Decimal("16.90")),
    (4, 0, Decimal("5.99")), (4, 1, Decimal("6.49")),
]


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        user = db.scalar(select(User).where(User.email == "demo@precomobi.local"))
        if not user:
            user = User(name="Usuário de demonstração", email="demo@precomobi.local", password_hash=hash_password(DEMO_PASSWORD))
            db.add(user)
            db.flush()
        elif not is_bcrypt_hash(user.password_hash):
            # banco criado antes da autenticação existir: troca o placeholder por um hash de verdade
            user.password_hash = hash_password(DEMO_PASSWORD)

        products = list(db.scalars(select(Product).order_by(Product.id)))
        if not products:
            products = [
                Product(ean=ean, name=name, brand=brand, category=category, quantity_value=quantity, quantity_unit=unit)
                for ean, name, brand, category, quantity, unit in PRODUCTS
            ]
            db.add_all(products)
            db.flush()

        markets = list(db.scalars(select(Market).order_by(Market.id)))
        if not markets:
            markets = [Market(name=name, address=address, neighborhood=neighborhood, city="Serra", state="ES") for name, address, neighborhood in MARKETS]
            for market in markets:
                if market.name in MARKET_COORDINATES:
                    market.latitude, market.longitude = MARKET_COORDINATES[market.name]
            db.add_all(markets)
            db.flush()
        else:
            for market in markets:
                if market.name in MARKET_RENAMES:
                    new_name, new_address, new_neighborhood = MARKET_RENAMES[market.name]
                    market.name, market.address, market.neighborhood = new_name, new_address, new_neighborhood
            for market in markets:
                if market.name in MARKET_COORDINATES:
                    market.latitude, market.longitude = MARKET_COORDINATES[market.name]
            db.add_all(markets)
            db.flush()

        if not db.scalar(select(PriceReport).limit(1)):
            db.add_all([
                PriceReport(product_id=products[product_index].id, market_id=markets[market_index].id, user_id=user.id, price=price, source_type="development")
                for product_index, market_index, price in PRICES
            ])

        db.commit()
