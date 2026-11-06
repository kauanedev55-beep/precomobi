import assert from 'node:assert/strict';
import {test} from 'node:test';
import {produceGuide,productDisplayName,catalogCredit} from '../.test-build/produceGuides.js';
const url='https://www.extrabom.com.br/p/';
test('banana varieties keep different names and practical recognition hints',()=>{
 const varieties=[['banana-da-terra-penca/1388/','Banana-da-terra'],['banana-prata-penca/1421/','Banana prata'],['banana-nanica-penca/1407/','Banana nanica']];
 const hints=[];
 for(const [path,title] of varieties){const p={name:'original',catalog_source_url:url+path};assert.equal(productDisplayName(p),title);const g=produceGuide(p);assert.ok(g.hint.length>20);hints.push(g.hint);}
 assert.equal(new Set(hints).size,3);
});
test('sweet-potato skin color never becomes an unsupported purple-flesh claim',()=>{
 const old={name:'Batata-doce',catalog_source_url:url+'batata-doce-unidade/1475/'};
 const purple={name:'Batata-doce de casca roxa',catalog_source_url:'https://www.rappi.com.br/p/batata-doce-roxa-251429'};
 assert.match(productDisplayName(old),/casca rosada/);
 assert.match(productDisplayName(purple),/casca roxa/);
 assert.match(produceGuide(purple).hint,/confira.*etiqueta/);
 assert.match(produceGuide(purple).hint,/não mostra o interior/);
 assert.equal(catalogCredit(purple.catalog_source_url),'Assaí via Rappi');
 assert.equal(catalogCredit(old.catalog_source_url),'Extrabom');
});
test('unknown or manually registered products are not guessed from their names',()=>{
 const p={name:'Batata-doce da vizinha',catalog_source_url:null};assert.equal(produceGuide(p),null);assert.equal(productDisplayName(p),p.name);
 assert.equal(catalogCredit('https://extrabom.com.br.example/fake'),'catálogo de origem');
});
test('Carone catalog credits recognize official hosts without trusting lookalike domains',()=>{
 for(const host of ['www.carone.com.br','carone.com.br','fs.carone.com.br']) assert.equal(catalogCredit(`https://${host}/produto/p`),'Carone');
 assert.equal(catalogCredit('https://carone.com.br.example/produto/p'),'catálogo de origem');
});
