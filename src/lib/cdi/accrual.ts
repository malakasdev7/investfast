import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {dailyCdi} from './rates';
import {today,type Row} from '@/lib/domain';
type Context={supabase:SupabaseClient;user:{id:string}};
export async function refreshCdi({supabase,user}:Context,until=today(),onlyAsset?:string):Promise<Row[]>{
 const assets=await supabase.from('assets').select('id,cdi_percent').eq('user_id',user.id).eq('asset_class','cdi');
 if(assets.error)throw new Error('Não foi possível consultar as caixinhas.');
 const status:Row[]=[];let rateWarning:string|null=null;
 for(const asset of assets.data.filter(a=>!onlyAsset||a.id===onlyAsset)){
  const entry:Row={id:asset.id,asset_id:asset.id,user_id:user.id,created_at:new Date().toISOString(),source:'manual',warning:null,rate_date:null};
  const base=await supabase.from('asset_prices').select('price_date,price_source').eq('user_id',user.id).eq('asset_id',asset.id).order('price_date',{ascending:false}).limit(1).maybeSingle();
  if(base.error){entry.warning='Não foi possível consultar o saldo anterior.';status.push(entry);continue;}
  if(base.data){entry.source=base.data.price_source;entry.price_date=base.data.price_date;if(base.data.price_source==='cdi_estimate')entry.rate_date=new Date(Date.parse(base.data.price_date+'T12:00:00Z')-86400000).toISOString().slice(0,10);}
  if(!base.data||!asset.cdi_percent||base.data.price_date>=until){status.push(entry);continue;}
  if(rateWarning){entry.warning=rateWarning;status.push(entry);continue;}
  try{
   const end=new Date(Date.parse(until+'T12:00:00Z')-86400000).toISOString().slice(0,10);
   const rates=await dailyCdi(base.data.price_date,end);
   for(let i=0;i<rates.length;i+=500){const saved=await supabase.from('cdi_daily_rates').upsert(rates.slice(i,i+500).map(r=>({...r,user_id:user.id})),{onConflict:'user_id,rate_date'});if(saved.error)throw new Error('Não foi possível salvar as taxas CDI.');}
   if(rates.length){const applied=await supabase.rpc('accrue_cdi',{p_asset:asset.id,p_until:until});if(applied.error)throw new Error('Não foi possível atualizar o rendimento CDI.');Object.assign(entry,applied.data);}
  }catch(e){entry.warning=e instanceof Error?e.message:'Rendimento temporariamente indisponível.';rateWarning=String(entry.warning);}
  status.push(entry);
 }
 return status;
}
