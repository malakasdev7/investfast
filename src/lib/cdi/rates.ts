import 'server-only';
import {z} from 'zod';
const series=z.array(z.object({data:z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),valor:z.string().regex(/^\d+(\.\d+)?$/)}));
const br=(iso:string)=>iso.split('-').reverse().join('/');
export async function dailyCdi(start:string,end:string){
 const result:{rate_date:string;daily_percent:string}[]=[];
 // SGS caps daily requests at ten years. Use calendar-year chunks, cached server-side.
 for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++){
  const from=start>`${year}-01-01`?start:`${year}-01-01`,until=end<`${year}-12-31`?end:`${year}-12-31`;
  const url=`https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?${new URLSearchParams({formato:'json',dataInicial:br(from),dataFinal:br(until)})}`;
  let payload:unknown;let successful=false;
  for(let attempt=0;attempt<3;attempt++){
   try{const r=await fetch(url,{next:{revalidate:21600},signal:AbortSignal.timeout(8000)});if(r.status===404){payload=[];successful=true;break;}if(!r.ok)throw new Error('BCB indisponível');payload=await r.json();successful=true;break;}catch{if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400*2**attempt));}
  }
  if(!successful)throw new Error('CDI diário temporariamente indisponível. O último saldo foi preservado.');
  const parsed=series.safeParse(payload);if(!parsed.success)throw new Error('CDI diário temporariamente indisponível. O último saldo foi preservado.');
  for(const row of parsed.data){const date=row.data.split('/').reverse().join('-');if(date<from||date>until||Number(row.valor)>=10)throw new Error('Taxa CDI inválida.');result.push({rate_date:date,daily_percent:row.valor});}
 }
 return result;
}
