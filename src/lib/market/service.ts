import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {catalog} from './catalog';
import * as provider from './providers';
import {dayCounts,type MarketAsset,type MarketItem,type MarketResult,type MarketType,type Period,type Price} from './types';
export type MarketContext={supabase:SupabaseClient;user:{id:string}};
function dbError(error:unknown){if(error)throw new Error('Não foi possível acessar o histórico de mercado. Tente novamente.');}
export async function ensureAsset(ctx:MarketContext,a:MarketAsset):Promise<MarketAsset>{
  const {data,error}=await ctx.supabase.from('market_assets').upsert({user_id:ctx.user.id,ticker:a.ticker,name:a.name,type:a.type,asset_class:a.asset_class,currency:a.currency,provider:a.provider,provider_id:a.provider_id},{onConflict:'user_id,type,provider_id',ignoreDuplicates:true});dbError(error);void data;
  const result=await ctx.supabase.from('market_assets').select('*').eq('user_id',ctx.user.id).eq('type',a.type).eq('provider_id',a.provider_id).single();dbError(result.error);return result.data as MarketAsset;
}
export async function resolveAsset(ctx:MarketContext,type:MarketType,id:string){
  const saved=await ctx.supabase.from('market_assets').select('*').eq('user_id',ctx.user.id).eq('type',type).eq('provider_id',id).maybeSingle();dbError(saved.error);
  if(saved.data)return saved.data as MarketAsset;
  const known=catalog.find(a=>a.type===type&&a.provider_id.toLowerCase()===id.toLowerCase());
  if(known)return ensureAsset(ctx,known);
  const found=(await provider.discover(type,id)).find(a=>a.provider_id.toLowerCase()===id.toLowerCase());
  if(!found)throw new Error('Ativo não encontrado no catálogo do provedor.');return ensureAsset(ctx,found);
}
export async function savePrices(ctx:MarketContext,a:MarketAsset,prices:Price[]){
  for(let i=0;i<prices.length;i+=400){const {error}=await ctx.supabase.from('market_prices').upsert(prices.slice(i,i+400).map(p=>({...p,asset_id:a.id,user_id:ctx.user.id})),{onConflict:'user_id,asset_id,timestamp,source',ignoreDuplicates:true});dbError(error);}
}
async function latest(ctx:MarketContext,a:MarketAsset):Promise<Price|null>{
  const r=await ctx.supabase.from('market_prices').select('price,timestamp,source,change,change_percent,change_7d,change_30d,high,low,volume,market_cap').eq('asset_id',a.id).eq('user_id',ctx.user.id).order('timestamp',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle();dbError(r.error);
  const investment=await ctx.supabase.from('assets').select('current_price,price_updated_at').eq('user_id',ctx.user.id).eq('ticker',a.ticker).eq('asset_class',a.asset_class).maybeSingle();dbError(investment.error);
  if(investment.data?.price_updated_at&&(!r.data||Date.parse(investment.data.price_updated_at)>Date.parse(r.data.timestamp))){
    const manual:Price={price:String(investment.data.current_price),timestamp:investment.data.price_updated_at,source:'manual'};await savePrices(ctx,a,[manual]);return manual;
  }
  return r.data as Price|null;
}
async function refresh(ctx:MarketContext,a:MarketAsset,warnings:Set<string>){
  if(!provider.configured(a)){warnings.add(`${a.type==='cripto'?'Criptomoedas':'B3'}: cotações automáticas indisponíveis. Exibindo preços salvos ou manuais.`);return;}
  const checked=Number(a.metadata?.checked_at||0);if(Date.now()-checked<60000){if(a.metadata?.quote_error)warnings.add(String(a.metadata.quote_error));return;}
  let message='';
  try{await savePrices(ctx,a,[await provider.quote(a)]);}catch{message='O provedor não respondeu ou o plano não permite esta cotação. Exibindo o último preço salvo.';warnings.add(message);}
  const metadata={...a.metadata,checked_at:Date.now(),quote_error:message};
  const r=await ctx.supabase.from('market_assets').update({metadata}).eq('id',a.id).eq('user_id',ctx.user.id);dbError(r.error);a.metadata=metadata;
}
export async function marketList(ctx:MarketContext,type:MarketType|'favoritos',search:string):Promise<MarketResult>{
  const warnings=new Set<string>();
  const saved=await ctx.supabase.from('market_assets').select('*').eq('user_id',ctx.user.id);dbError(saved.error);
  const favorites=await ctx.supabase.from('user_favorite_assets').select('asset_id').eq('user_id',ctx.user.id);dbError(favorites.error);
  const favoriteIds=new Set((favorites.data||[]).map(f=>f.asset_id));
  let assets:MarketAsset[]=type==='favoritos'?(saved.data||[]).filter(a=>favoriteIds.has(a.id)):catalog.filter(a=>a.type===type);
  if(type!=='favoritos'){
    assets=[...assets,...(saved.data||[]).filter(a=>a.type===type)];
    if(search.length>=2)try{assets.push(...await provider.discover(type,search));}catch{warnings.add('Busca externa indisponível. Pesquisando apenas no catálogo e nos dados salvos.');}
  }
  const unique=new Map<string,MarketAsset>();for(const a of assets)unique.set(a.type+':'+a.provider_id,a);
  assets=[...unique.values()].filter(a=>!search||`${a.ticker} ${a.name}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).slice(0,40);
  const items:MarketItem[]=[];
  // Small batches prevent bursts against provider rate limits.
  for(let i=0;i<assets.length;i+=3){items.push(...await Promise.all(assets.slice(i,i+3).map(async asset=>{
    const a=asset.id?asset:await ensureAsset(ctx,asset);await refresh(ctx,a,warnings);return {...a,quote:await latest(ctx,a),favorite:favoriteIds.has(a.id)};
  })));}
  return {items,warnings:[...warnings]};
}
export async function marketDetail(ctx:MarketContext,type:MarketType,id:string,period:Period):Promise<MarketResult>{
  const warnings=new Set<string>(),a=await resolveAsset(ctx,type,id);await refresh(ctx,a,warnings);
  const historyKey=`history_${period}`,last=Number(a.metadata?.[historyKey]||0);
  if(provider.configured(a)&&Date.now()-last>=60000){
    try{const points=await provider.history(a,period);await savePrices(ctx,a,points);const metadata={...a.metadata,[historyKey]:Date.now()};
      if(a.type!=='cripto'&&a.type!=='indices')try{metadata.dividends=await provider.dividends(a);}catch{warnings.add('Dividendos indisponíveis para este ativo ou plano.');}
      const r=await ctx.supabase.from('market_assets').update({metadata}).eq('id',a.id).eq('user_id',ctx.user.id);dbError(r.error);a.metadata=metadata;
    }catch{warnings.add('Histórico externo indisponível para este período. Exibindo o histórico salvo.');}
  }
  const since=period==='max'?new Date(0).toISOString():new Date(Date.now()-dayCounts[period]*86400000).toISOString();
  const current=await latest(ctx,a);let points:Price[]=[];
  // Paginate to avoid Supabase's default 1000-row cap truncating charts.
  for(let offset=0;offset<20000;offset+=1000){const r=await ctx.supabase.from('market_prices').select('price,timestamp,source,volume,high,low').eq('asset_id',a.id).eq('user_id',ctx.user.id).gte('timestamp',since).order('timestamp',{ascending:false}).range(offset,offset+999);dbError(r.error);points.push(...r.data as Price[]);if(r.data!.length<1000)break;}
  points=points.reverse();const stride=Math.max(1,Math.ceil(points.length/1500));const chart=points.filter((_,i)=>i%stride===0||i===points.length-1);
  const f=await ctx.supabase.from('user_favorite_assets').select('asset_id').eq('user_id',ctx.user.id).eq('asset_id',a.id).maybeSingle();dbError(f.error);
  return {items:[{...a,quote:current,favorite:Boolean(f.data)}],warnings:[...warnings],history:chart,historyNote:a.type==='cripto'?'CoinGecko Demo: até 365 dias externos, além do histórico já salvo.':'Disponibilidade e intervalos dependem do plano brapi; preços históricos podem ser ajustados pelo provedor.'};
}
