import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticated,apiError,checkOrigin,databaseError } from '@/lib/api';
import {refreshCdi} from '@/lib/cdi/accrual';
import { today } from '@/lib/domain';
import { entities } from '@/lib/domain';
import { entitySchema } from '@/lib/validations/entities';

type Context={params:Promise<{entity:string}>};
async function mutate(request:NextRequest,context:Context){
  try{
    checkOrigin(request);
    const {entity}=await context.params;
    if(!entities[entity]) throw new Error('Módulo inválido.');
    const {supabase,user}=await authenticated();
    const body=await request.json();
    if(entity==='profiles'&&request.method!=='PATCH') throw new Error('Operação inválida.');
    if(request.method==='DELETE'){
      const {id}=z.object({id:z.uuid()}).strict().parse(body);
      if(entity==='transactions'){
        const {data:files,error}=await supabase.from('attachments').select('path').eq('transaction_id',id).eq('user_id',user.id);
        if(error) throw databaseError(error.code,error.message);
        if(files?.length) throw new Error('Remova os anexos desta transação antes de excluí-la.');
      }
      const {data,error}=await supabase.from(entity).delete().eq('id',id).eq('user_id',user.id).select('id');
      if(error) throw databaseError(error.code,error.message);
      if(!data?.length) throw new Error('Registro não encontrado.');
      return Response.json({ok:true});
    }
    const envelope=z.object({id:z.uuid().optional(),values:z.record(z.string(),z.unknown())}).strict().parse(body);
    const values=entitySchema(entity).parse(envelope.values);
    if(entity==='assets'&&request.method==='PATCH'&&values.cdi_percent){
      const {data:previous,error:previousError}=await supabase.from('assets').select('asset_class,cdi_percent').eq('id',z.uuid().parse(envelope.id)).eq('user_id',user.id).single();
      if(previousError)throw databaseError(previousError.code,previousError.message);
      if(previous.asset_class==='cdi'&&Number(previous.cdi_percent)!==Number(values.cdi_percent)){
        const status=await refreshCdi({supabase,user},today(),envelope.id);
        if(status.some(s=>s.warning))throw new Error('Aguarde a atualização do CDI antes de alterar o percentual.');
        const {data:asset,error:priceError}=await supabase.from('assets').select('current_price').eq('id',envelope.id!).single();
        if(priceError)throw databaseError(priceError.code,priceError.message);
        const {error:anchorError}=await supabase.from('asset_prices').upsert({asset_id:envelope.id,price:asset.current_price,price_date:today(),price_source:status[0]?.source||'manual'},{onConflict:'user_id,asset_id,price_date'});
        if(anchorError)throw databaseError(anchorError.code,anchorError.message);
      }
    }
    if(entity==='asset_prices')values.price_source='manual';
    if(entity==='recurring_transactions'){
      values.next_date=values.start_date;
      values.anchor_day=Number(String(values.start_date).slice(-2));
    }
    const query=request.method==='POST'?supabase.from(entity).insert(values):supabase.from(entity).update(values).eq('id',z.uuid().parse(envelope.id)).eq('user_id',user.id);
    const {data,error}=await query.select('id').single();
    if(error) throw databaseError(error.code,error.message);
    return Response.json({id:data.id});
  }catch(e){
    if(e instanceof z.ZodError) return Response.json({error:e.issues.map(x=>x.message).join(' ')},{status:422});
    return apiError(e);
  }
}
export const POST=mutate;
export const PATCH=mutate;
export const DELETE=mutate;
