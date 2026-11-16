import assert from 'node:assert/strict';
import {providerJSON} from '../src/lib/market/http';
import {quote,history,dividends} from '../src/lib/market/providers';
import {catalog} from '../src/lib/market/catalog';
async function main(){
let calls=0;
const retry=async()=>{calls++;return new Response(JSON.stringify(calls===1?{}:{ok:true}),{status:calls===1?429:200});};
assert.deepEqual(await providerJSON('https://retry.example/quotes',{},retry as typeof fetch),{ok:true});assert.equal(calls,2);
calls=0;const denied=async()=>{calls++;return new Response('{}',{status:401});};
await assert.rejects(()=>providerJSON('https://denied.example/quotes',{},denied as typeof fetch));assert.equal(calls,1);
const original=globalThis.fetch;process.env.BRAPI_API_KEY='unit-test-not-a-real-key';process.env.COINGECKO_API_KEY='unit-test-not-a-real-key';
globalThis.fetch=(async(input,init)=>{
 const url=String(input);assert.ok(!url.includes('unit-test-not-a-real-key'));
 const headers=init?.headers as Record<string,string>;assert.ok(headers.Authorization||headers['x-cg-demo-api-key']);
 if(url.includes('stocks/quote'))return Response.json({results:[{symbol:'PETR4',data:{regularMarketPrice:32.15,regularMarketTime:'2026-01-01T12:00:00Z',regularMarketChange:-1,regularMarketChangePercent:-3}}]});
 if(url.includes('stocks/historical'))return Response.json({results:[{data:{historicalDataPrice:[{date:1767225600,close:31,volume:100}]}}]});
 if(url.includes('fii/dividends'))return Response.json({dividends:[{label:'RENDIMENTO',rate:0.1,paymentDate:'2026-01-01'}]});
 if(url.includes('market_chart'))return Response.json({prices:[[1767225600000,500000]]});
 return Response.json([{current_price:500000,last_updated:'2026-01-01T12:00:00Z',price_change_percentage_7d_in_currency:2,price_change_percentage_30d_in_currency:5}]);
}) as typeof fetch;
try{
 assert.equal((await quote(catalog[0])).price,'32.15');
 assert.equal((await history(catalog[0],'1mo'))[0].price,'31');
 assert.equal((await quote(catalog.find(a=>a.ticker==='BTC')!)).change_7d,'2');
 assert.equal((await history(catalog.find(a=>a.ticker==='BTC')!,'max'))[0].price,'500000');
 assert.equal((await dividends(catalog.find(a=>a.type==='fiis')!))[0].rate,'0.1');
 delete process.env.BRAPI_API_KEY;await assert.rejects(()=>quote(catalog[0]),/chave não configurada/);
 console.log('PASS: retry 429, permanent errors, provider formats, header-only keys and missing-key fallback');
}finally{globalThis.fetch=original;delete process.env.BRAPI_API_KEY;delete process.env.COINGECKO_API_KEY;}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
