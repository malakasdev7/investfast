export const marketTypes = ['acoes','fiis','cripto','indices'] as const;
export type MarketType = typeof marketTypes[number];
export const periods = {'1d':'1 dia','7d':'1 semana','1mo':'1 mês','3mo':'3 meses','6mo':'6 meses','1y':'1 ano',max:'Máximo disponível'} as const;
export type Period = keyof typeof periods;
export type MarketAsset = {id?:string; ticker:string; name:string; type:MarketType; asset_class:'stock'|'fii'|'etf'|'bdr'|'crypto'|'index'; currency:'BRL'|'POINTS'; provider:'brapi'|'coingecko'|'manual'; provider_id:string; metadata?:Record<string,unknown>};
export type Price = {price:string; timestamp:string; source:MarketAsset['provider']; change?:string|null; change_percent?:string|null; change_7d?:string|null; change_30d?:string|null; high?:string|null; low?:string|null; volume?:string|null; market_cap?:string|null};
export type MarketItem = MarketAsset & {quote:Price|null; favorite:boolean};
export type MarketResult = {items:MarketItem[]; warnings:string[]; history?:Price[]; historyNote?:string};
export const dayCounts:Record<Period,number>={'1d':1,'7d':7,'1mo':30,'3mo':90,'6mo':180,'1y':365,max:36500};
export function marketPath(a:MarketAsset){return `/mercado/${a.type}/${encodeURIComponent(a.provider_id)}`;}
export function decimal(v:unknown):string|null {return (typeof v==='number'||typeof v==='string')&&v!==''&&Number.isFinite(Number(v))?String(v):null;}
export function validPrice(p:Price){return Number.isFinite(Number(p.price))&&Number(p.price)>=0&&Number.isFinite(Date.parse(p.timestamp))&&Date.parse(p.timestamp)<=Date.now()+300000;}
