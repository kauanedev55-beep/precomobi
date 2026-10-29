import assert from 'node:assert/strict';
import { test } from 'node:test';
import { productCode } from '../.test-build/scannedCode.js';
import { googleMapsUrl, hasCoordinates, fetchRoadRoute } from '../.test-build/navigation.js';
import { moneyCents, netSaving, tripCost } from '../.test-build/purchase.js';

const market = { name:'Loja & Filhos', address:'Rua A, 10', city:'Serra', state:'ES', neighborhood:null, latitude:null, longitude:null };
test('Maps uses full address when coordinates are absent and encodes parameters', () => {
  const u = new URL(googleMapsUrl(market, 'Rua B, Vitória/ES'));
  assert.equal(u.origin, 'https://www.google.com');
  assert.equal(u.searchParams.get('destination'), 'Loja & Filhos, Rua A, 10, Serra, ES');
  assert.equal(u.searchParams.get('origin'), 'Rua B, Vitória/ES');
  assert.equal(u.searchParams.get('travelmode'), 'driving');
});
test('valid zero coordinates are retained but empty and invalid ones rejected', () => {
  assert.equal(hasCoordinates({...market, latitude:0, longitude:0}), true);
  for (const latitude of ['', 'NaN', '91', null]) assert.equal(hasCoordinates({...market, latitude, longitude:10}), false);
  const u = new URL(googleMapsUrl({...market, latitude:'-20.1', longitude:'-40.2'}, {lat:0, lon:1}));
  assert.equal(u.searchParams.get('destination'), '-20.1,-40.2');
  assert.equal(u.searchParams.get('origin'), '0,1');
});
test('QR identifies a product without opening arbitrary URLs or importing prices', () => {
  assert.equal(productCode('3017620422003'), '3017620422003');
  assert.equal(productCode('{"ean":"3017620422003","price":"0.01"}'), '3017620422003');
  assert.equal(productCode('https://example.com/item?ean=3017620422003'), '3017620422003');
  assert.equal(productCode('https://world.openfoodfacts.org/product/3017620422003/nutella'), '3017620422003');
  for (const bad of ['javascript:alert(1)', '<script>alert(1)</script>', 'https://example.com/nfce?p=12345678901234567890123456789012345678901234', '{"price":1}', '{"ean":3017620422003}', '123']) assert.equal(productCode(bad), null);
});
test('trip cost can reverse the cheapest basket without rounding artifacts', () => {
  assert.equal(moneyCents('0.29'),29);
  assert.equal(netSaving(10, 18, 3), -500);
  assert.equal(netSaving(10, 0, 0), 1000);
  assert.equal(netSaving(10, 13, 3), 0);
  assert.equal(tripCost(4.5, 0.8), 7.2);
});
test('route rejects absent coordinates before contacting external service', async () => {
  await assert.rejects(fetchRoadRoute({lat:0,lon:0}, market), /coordenadas/);
});
test('route accepts actual service distance but rejects malformed values', async t => {
  const m = {...market,latitude:0,longitude:1};
  t.mock.method(globalThis,'fetch',async () => ({ok:true,json:async()=>({code:'Ok',routes:[{distance:1500,duration:300,geometry:{coordinates:[[1,0],[1.1,0.1]]}}]})}));
  assert.deepEqual(await fetchRoadRoute({lat:0,lon:0},m), {km:1.5,minutes:5,coordinates:[[0,1],[0.1,1.1]]});
  globalThis.fetch = async () => ({ok:true,json:async()=>({code:'Ok',routes:[{distance:-1,duration:300,geometry:{coordinates:[]}}]})});
  await assert.rejects(fetchRoadRoute({lat:0,lon:0},m), /Rota não encontrada/);
});
