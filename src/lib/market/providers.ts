import 'server-only';
import {providerJSON} from './http';
import {decimal,validPrice,dayCounts,type MarketAsset,type MarketType,type Price,type Period} from './types';
type Data=Record<string,unknown>;
const obj=(v:unknown):Data=>v&&typeof v==='object'?v as Data:{};
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const str=(v:unknown)=>typeof v==='string'?v:'';
export function configured(a:MarketAsset){return Boolean(a.type==='cripto'?process.env.COINGECKO_API_KEY:process.env.BRAPI_API_KEY);}
function brapi(path:string,params:Record<string,string>){if(!process.env.BRAPI_API_KEY)throw new Error('Cotações automáticas da B3 indisponíveis: chave não configurada.');return providerJSON<Data>('https://brapi.dev'+path+'?'+new URLSearchParams(params),{Authorization:`Bearer ${process.env.BRAPI_API_KEY}`});}
function gecko(path:string,params:Record<string,string>){if(!process.env.COINGECKO_API_KEY)throw new Error('Cotações automáticas de cripto indisponíveis: chave não configurada.');return providerJSON<unknown>('https://api.coingecko.com/api/v3'+path+'?'+new URLSearchParams(params),{'x-cg-demo-api-key':process.env.COINGECKO_API_KEY});}
export async function discover(type:MarketType,search:string):Promise<MarketAsset[]>{
  if(type==='cripto'){
    const data=obj(await gecko('/search',{query:search}));
    return arr(data.coins).slice(0,20).map(v=>{const r=obj(v);return {ticker:str(r.symbol).toUpperCase(),name:str(r.name),type,asset_class:'crypto',currency:'BRL',provider:'coingecko',provider_id:str(r.id)};});
  }
  const data=await brapi('/api/quote/list',{search,limit:'20'});
  return (type==='indices'?arr(data.indexes):arr(data.stocks)).map(v=>{
    const r=obj(v),sub=str(r.subType)||str(r.type),cls:MarketAsset['asset_class']=type==='indices'?'index':sub==='fii'||sub==='fund'?'fii':sub==='etf'?'etf':sub==='bdr'?'bdr':'stock';
    return {ticker:str(r.stock),name:str(r.name),type:(cls==='index'?'indices':cls==='fii'?'fiis':'acoes') as MarketType,asset_class:cls,currency:cls==='index'?'POINTS' as const:'BRL' as const,provider:'brapi' as const,provider_id:str(r.stock)};
  }).filter(a=>a.type===type&&a.ticker);
}
export async function quote(a:MarketAsset):Promise<Price>{
  let r:Data,p:Price;
  if(a.type==='cripto'){
    r=obj(arr(await gecko('/coins/markets',{vs_currency:'brl',ids:a.provider_id,price_change_percentage:'24h,7d,30d',precision:'full'}))[0]);
    p={price:decimal(r.current_price)??'',timestamp:str(r.last_updated),source:'coingecko',change:decimal(r.price_change_24h),change_percent:decimal(r.price_change_percentage_24h),change_7d:decimal(r.price_change_percentage_7d_in_currency),change_30d:decimal(r.price_change_percentage_30d_in_currency),high:decimal(r.high_24h),low:decimal(r.low_24h),volume:decimal(r.total_volume),market_cap:decimal(r.market_cap)};
  }else{
    const data=await brapi('/api/v2/stocks/quote',{symbols:a.provider_id});r=obj(obj(arr(data.results)[0]).data);
    p={price:decimal(r.regularMarketPrice)??'',timestamp:str(r.regularMarketTime),source:'brapi',change:decimal(r.regularMarketChange),change_percent:decimal(r.regularMarketChangePercent),high:decimal(r.regularMarketDayHigh),low:decimal(r.regularMarketDayLow),volume:decimal(r.regularMarketVolume),market_cap:decimal(r.marketCap)};
  }
  if(!p.price||!validPrice(p))throw new Error('O provedor não retornou cotação válida.');return p;
}
export async function history(a:MarketAsset,period:Period):Promise<Price[]>{
  let points:Price[];
  if(a.type==='cripto'){
    // Demo plan supports at most 365 days; older saved points remain in Supabase.
    const data=obj(await gecko(`/coins/${encodeURIComponent(a.provider_id)}/market_chart`,{vs_currency:'brl',days:String(Math.min(dayCounts[period],365))}));
    points=arr(data.prices).map(v=>{const pair=arr(v);return {price:decimal(pair[1])??'',timestamp:new Date(Number(pair[0])).toISOString(),source:'coingecko'};});
  }else{
    const data=await brapi('/api/v2/stocks/historical',{symbols:a.provider_id,range:period,interval:period==='1d'?'60m':period==='max'?'1mo':'1d',sortOrder:'asc'});
    points=arr(obj(obj(arr(data.results)[0]).data).historicalDataPrice).map(v=>{const r=obj(v);return {price:decimal(r.close)??'',timestamp:new Date(Number(r.date)*1000).toISOString(),source:'brapi',high:decimal(r.high),low:decimal(r.low),volume:decimal(r.volume)};});
  }
  return points.filter(p=>p.price&&validPrice(p));
}
export async function dividends(a:MarketAsset):Promise<Data[]>{
  if(a.type==='cripto'||a.type==='indices')return [];
  const data=await brapi(a.type==='fiis'?'/api/v2/fii/dividends':'/api/v2/stocks/dividends',{symbols:a.provider_id});
  return arr(a.type==='fiis'?data.dividends:obj(obj(arr(data.results)[0]).data).cashDividends).slice(0,30).map(v=>{const r=obj(v);return {label:str(r.label),rate:decimal(r.rate),paymentDate:str(r.paymentDate)};});
}
