import type {MarketAsset,MarketType} from './types';
const groups:Record<MarketType,string[][]>={
  acoes:[['PETR4','Petrobras'],['VALE3','Vale'],['ITUB4','Itaú Unibanco'],['BBAS3','Banco do Brasil'],['WEGE3','WEG'],['BOVA11','iShares Ibovespa','etf'],['IVVB11','iShares S&P 500','etf'],['AAPL34','Apple','bdr'],['MSFT34','Microsoft','bdr']],
  fiis:[['HGLG11','Pátria Log'],['KNRI11','Kinea Renda Imobiliária'],['MXRF11','Maxi Renda'],['XPML11','XP Malls'],['HGRU11','Pátria Renda Urbana']],
  cripto:[['bitcoin','Bitcoin','BTC'],['ethereum','Ethereum','ETH'],['solana','Solana','SOL'],['ripple','XRP','XRP'],['cardano','Cardano','ADA'],['dogecoin','Dogecoin','DOGE'],['binancecoin','BNB','BNB'],['chainlink','Chainlink','LINK']],
  indices:[['^BVSP','Ibovespa'],['^IFIX','Índice de Fundos Imobiliários']]
};
export const catalog:MarketAsset[]=Object.entries(groups).flatMap(([kind,rows])=>rows.map(([id,name,extra])=>({ticker:kind==='cripto'?extra:id,name,type:kind as MarketType,asset_class:(kind==='cripto'?'crypto':kind==='indices'?'index':kind==='fiis'?'fii':extra||'stock') as MarketAsset['asset_class'],currency:kind==='indices'?'POINTS' as const:'BRL' as const,provider:kind==='cripto'?'coingecko' as const:'brapi' as const,provider_id:id})));
