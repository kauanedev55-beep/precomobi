import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cityMarkets,marketNetwork,networkChoices,selectedMarketIds,offersForMarkets,mapDestinations} from '../.test-build/marketScope.js';
const stores=[
 {id:1,name:'Carone Laranjeiras',city:'Serra',state:'ES'},
 {id:2,name:'Carone Jardim Limoeiro',city:'Serra',state:'ES'},
 {id:3,name:'Extrabom Colina de Laranjeiras',city:'Serra',state:'ES'},
 {id:4,name:'Supermercados BH Laranjeiras',city:'Serra',state:'ES'},
 {id:5,name:'Carone Vitória',city:'Vitória',state:'ES'},
 {id:6,name:'Carone Cabo Frio',city:'Cabo Frio',state:'RJ'},
];
test('market options come from the city registry even when a chain has no offers',()=>{
 const city=cityMarkets(stores,' SERRA ');
 assert.deepEqual(networkChoices(city),['Carone','Extrabom','Supermercados BH']);
 assert.deepEqual(selectedMarketIds(city,'Extrabom',''),[3]);
 assert.deepEqual(selectedMarketIds(city,'Carone','2'),[2]);
 assert.deepEqual(selectedMarketIds(city,'Carone','5'),[]);
 assert.equal(marketNetwork('Preço informado · administradora'),'Preço informado · administradora');
 assert.equal(marketNetwork('Sempre Tem Jacaraípe'),'Sempretem');
});
test('selecting a store retains its real offer instead of the group representative',()=>{
 const group={id:11,market:stores[0],source_label:'Folheto oficial · revisão administrativa',confirmations:0,related_offers:[{id:12,market:stores[1],confirmations:3}]};
 const result=offersForMarkets([group],[2]);
 assert.equal(result.length,1);assert.equal(result[0].id,12);assert.equal(result[0].confirmations,3);
 assert.deepEqual(result[0].related_offers,[]);
 assert.deepEqual(offersForMarkets([group],[3]),[]);
 assert.equal(group.related_offers.length,1);
});
test('a selected map destination never expands to the other city stores',()=>{
 assert.deepEqual(mapDestinations(stores,2).map(m=>m.id),[2]);
 assert.deepEqual(mapDestinations(stores,999),[]);
 assert.deepEqual(cityMarkets(stores,'Serra').map(m=>m.id),[1,2,3,4]);
 assert.deepEqual(cityMarkets(stores,'Vitória').map(m=>m.id),[5]);
});
