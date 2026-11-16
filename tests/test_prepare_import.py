import importlib.util
from pathlib import Path
from datetime import datetime,timezone
import pytest
spec=importlib.util.spec_from_file_location("prepare_import",Path(__file__).resolve().parents[1]/"tools/preparar_importacao.py")
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
NOW=datetime(2026,11,16,20,tzinfo=timezone.utc)
ENTRY={"product_source_url":"https://www.carone.com.br/product/p","market_prefix":"Carone","sale_unit":"unit","regular_price":"7.49","club_price":None,"club_name":None,"conditions":"Somente a loja selecionada.","valid_from":"2026-11-16T00:00:00-03:00","valid_until":"2026-11-28T23:59:59-03:00","source_url":"https://www.flipsnack.com/carone/esp-rito-santo"}
PRODUCTS=[{"id":4,"catalog_source_url":ENTRY["product_source_url"],"sale_unit":"unit"}]
MARKETS=[{"id":1,"name":"Carone Serra","city":"Serra","state":"ES"},{"id":2,"name":"Carone RJ","city":"Cabo Frio","state":"RJ"},{"id":3,"name":"Carone Vitória","city":"Vitória","state":"ES"}]
def test_prepare_uses_existing_ids_and_never_marks_reviewed():
    batch=module.prepare([{**ENTRY,"cities":["Serra"]}],PRODUCTS,MARKETS,NOW)
    assert batch["reviewed"] is False and batch["entries"][0]["market_ids"]==[1] and batch["entries"][0]["product_id"]==4
@pytest.mark.parametrize("change",[{"valid_until":"2026-11-10T00:00:00-03:00"},{"sale_unit":"kg"},{"product_source_url":"https://example.invalid"},{"regular_price":"NaN"},{"regular_price":"1.001"}])
def test_prepare_rejects_ambiguous_or_expired_data(change):
    with pytest.raises(ValueError):module.prepare([{**ENTRY,**change}],PRODUCTS,MARKETS,NOW)
