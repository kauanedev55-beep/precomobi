"""Collector fixtures: no network, credentials or production writes."""
import importlib.util
import json
from pathlib import Path

spec=importlib.util.spec_from_file_location("coletor_precos",Path(__file__).resolve().parents[1]/"tools/coletor_precos.py")
collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector)

def test_collector_keeps_region_and_cannot_publish(tmp_path):
    def fixture(url):
        if url.endswith("/api/markets"):return json.dumps([{"id":1,"name":"Carone Serra","city":"Serra","state":"ES"},{"id":2,"name":"Carone Cabo Frio","city":"Cabo Frio","state":"RJ"}])
        if url=="https://linktr.ee/caroneonline":return '<a href="https://www.flipsnack.com/carone/encarte-esp-rito-santo-16-11.html">ES</a><a href="https://www.flipsnack.com/carone/cabo-frio.html">RJ</a>'
        return "<html><title>Consulta</title></html>"
    first=collector.collect(tmp_path,fixture,"2026-11-16T20:00:00Z")
    carone=first["sources"][0]
    assert carone["status"]=="novo_ou_alterado"
    assert [m["id"] for m in carone["markets_to_review"]]==[1]
    assert len(carone["leaflets"])==1 and first["published_prices"]==0
    assert first["sources"][1]["status"]=="revisao_manual"
    second=collector.collect(tmp_path,fixture,"2026-11-17T20:00:00Z")
    assert second["sources"][0]["status"]=="sem_mudanca"

def test_failure_is_not_marked_updated_and_cannot_rewrite_source_history(tmp_path):
    (tmp_path/"estado.json").write_text('{"https://linktr.ee/caroneonline":"previous"}')
    def failed(url):raise OSError("offline")
    report=collector.collect(tmp_path,failed)
    assert all(row["status"]=="falha" for row in report["sources"])
    assert report["published_prices"]==0
    assert json.loads((tmp_path/"estado.json").read_text())["https://linktr.ee/caroneonline"]=="previous"

def test_allowed_urls_and_discovery_reject_other_publishers():
    assert collector.safe_url("https://www.extrabom.com.br/lojas/")
    assert not collector.safe_url("http://www.extrabom.com.br/lojas/")
    assert not collector.safe_url("https://www.extrabom.com.br.evil.invalid/")
    assert not collector.safe_url("https://user@www.extrabom.com.br/")
    result=collector.discover(collector.SOURCES[0],'<a href="https://www.flipsnack.com/another/esp-rito-santo.html">Wrong publisher</a>')
    assert result["leaflets"]==[]
