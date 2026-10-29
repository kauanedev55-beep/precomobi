"""Smoke HTTP da versão compilada, em processo real e banco temporário."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='precomobi-smoke-') as tmp:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = dict(os.environ, APP_ENV='test', DEMO_MODE='true', DATABASE_URL=f'sqlite:///{tmp}/smoke.db')
    server = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', str(port)], cwd=root/'backend', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f'http://127.0.0.1:{port}'
    def call(path, data=None, token=None):
        headers = {'Content-Type':'application/json'}
        if token: headers['Authorization'] = f'Bearer {token}'
        req = Request(base+path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
        with urlopen(req, timeout=5) as r:
            return r.status, r.read(), r.headers.get('Content-Type','')
    try:
        for attempt in range(40):
            try:
                assert call('/api/health')[0] == 200
                break
            except (OSError, URLError):
                if server.poll() is not None: raise RuntimeError('API encerrou durante startup')
                time.sleep(.25)
        else: raise RuntimeError('API não iniciou')
        for path in ['/', '/login', '/lista', '/mapa', '/historico']:
            status, body, content = call(path)
            assert status == 200 and 'text/html' in content and b'id="root"' in body, path
        try:
            call('/api/endpoint-inexistente')
            raise AssertionError('API desconhecida não pode retornar HTML')
        except HTTPError as e:
            assert e.code == 404
        identity = json.loads(call('/api/auth/demo-session', {})[1])
        token = identity['access_token']
        products = json.loads(call('/api/products?q=arroz')[1])
        created = json.loads(call('/api/shopping-lists', {'name':'Smoke HTTP','items':[{'product_id':products[0]['id'],'quantity':2}]},token)[1])
        comparison = json.loads(call(f'/api/comparisons/{created["id"]}',token=token)[1])
        assert len(comparison['results']) == 3
        assert all(row['complete'] for row in comparison['results'])
        assert json.loads(call('/api/shopping-lists',token=token)[1])[0]['id'] == created['id']
        assert json.loads(call('/api/health/database')[1])['database'] == 'connected'
        print('HTTP smoke: 5 rotas SPA, API 404, sessão demo, pesquisa, lista, comparação e persistência: APROVADO')
    finally:
        server.terminate()
        server.wait(timeout=10)
