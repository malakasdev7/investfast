import 'server-only';
// Only provider payloads are cached; never sessions, favorites or user prices.
const inflight=new Map<string,Promise<unknown>>();
const cooldown=new Map<string,number>();
export async function providerJSON<T>(url:string,headers:Record<string,string>,fetcher:typeof fetch=fetch):Promise<T>{
  const host=new URL(url).hostname;
  if((cooldown.get(host)||0)>Date.now()) throw new Error('Provedor temporariamente indisponível.');
  const running=inflight.get(url);if(running)return running as Promise<T>;
  const task=(async()=>{
    for(let attempt=0;attempt<3;attempt++){
      try{
        const response=await fetcher(url,{headers,signal:AbortSignal.timeout(8000),next:{revalidate:60}});
        if(response.ok)return await response.json() as T;
        if(response.status!==429&&response.status<500)throw new Error('PROVIDER_DENIED');
        if(attempt===2){cooldown.set(host,Date.now()+60000);throw new Error('PROVIDER_DENIED');}
        const retryAfter=Number(response.headers.get('retry-after'));
        if(retryAfter>3){cooldown.set(host,Date.now()+Math.min(retryAfter,300)*1000);throw new Error('PROVIDER_DENIED');}
        await new Promise(r=>setTimeout(r,Math.max(400*2**attempt,retryAfter*1000)+Math.random()*150));
      }catch(error){
        if(error instanceof Error&&error.message==='PROVIDER_DENIED')throw new Error('Provedor indisponível ou recurso não incluído no plano.');
        if(attempt===2){cooldown.set(host,Date.now()+60000);throw new Error('Não foi possível consultar o provedor.');}
        await new Promise(r=>setTimeout(r,400*2**attempt));
      }
    }
    throw new Error('Provedor indisponível.');
  })();
  inflight.set(url,task);
  try{return await task;}finally{inflight.delete(url);}
}
