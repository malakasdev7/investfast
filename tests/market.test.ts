import test from 'node:test';
import assert from 'node:assert/strict';
import {decimal,validPrice,marketPath} from '../src/lib/market/types';
import {catalog} from '../src/lib/market/catalog';
test('market prices reject invalid numbers and future timestamps without fabricating zeros',()=>{
  assert.equal(decimal(null),null);assert.equal(decimal(''),null);assert.equal(decimal(Infinity),null);
  assert.equal(decimal('0.000000123456'),'0.000000123456');
  assert.equal(validPrice({price:'-1',timestamp:new Date().toISOString(),source:'manual'}),false);
  assert.equal(validPrice({price:'1',timestamp:new Date(Date.now()+86400000).toISOString(),source:'manual'}),false);
});
test('catalog distinguishes crypto provider IDs, ETFs, BDRs and reference indices',()=>{
  const bitcoin=catalog.find(a=>a.ticker==='BTC')!;assert.equal(marketPath(bitcoin),'/mercado/cripto/bitcoin');
  assert.equal(catalog.find(a=>a.ticker==='IVVB11')?.asset_class,'etf');
  assert.equal(catalog.find(a=>a.ticker==='AAPL34')?.asset_class,'bdr');
  assert.equal(catalog.find(a=>a.ticker==='^BVSP')?.currency,'POINTS');
  assert.equal(new Set(catalog.map(a=>a.type+':'+a.provider_id)).size,catalog.length);
});
