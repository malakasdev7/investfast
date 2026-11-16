import { authenticated, apiError, databaseError } from '@/lib/api';
import { refreshCdi } from '@/lib/cdi/accrual';
import { insights } from '@/lib/calculations/finance';
import { today,type Snapshot } from '@/lib/domain';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(){
  try{
    const context=await authenticated();const {supabase}=context;
    const cdiStatus=await refreshCdi(context);
    const {error:generationError}=await supabase.rpc('generate_recurring');
    if(generationError) throw databaseError(generationError.code,generationError.message);
    const {data,error}=await supabase.rpc('app_snapshot');
    if(error) throw databaseError(error.code,error.message);
    const snapshot=data as Snapshot; snapshot.cdi_status=cdiStatus;
    const computed=insights(snapshot,today().slice(0,7)+'-01',today());
    const existing=snapshot.alerts??[];
    for(const alert of computed){
      const previous=existing.find(a=>a.title===alert.title);
      if(previous&&previous.description===alert.description&&previous.severity===alert.severity)continue;
      const query=previous?supabase.from('alerts').update(alert).eq('id',previous.id):supabase.from('alerts').insert(alert);
      const {error:alertError}=await query;
      if(alertError&&alertError.code!=='23505')console.error('Alert persistence failed',alertError.code);
    }
    const expired=existing.filter(a=>!computed.some(c=>c.title===a.title)).map(a=>a.id);
    if(expired.length)await supabase.from('alerts').delete().in('id',expired);
    return Response.json(data,{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){return apiError(e);}
}
