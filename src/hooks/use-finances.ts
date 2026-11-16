"use client";
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import type { Snapshot } from '@/lib/domain';
import { toast } from 'sonner';
export async function api<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,headers:{'Content-Type':'application/json',...init?.headers}});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error||'Não foi possível carregar os dados.');
  return data;
}
export function useFinances(){return useQuery({queryKey:['finances'],queryFn:()=>api<Snapshot>('/api/data'),retry:false});}
export function useRecordMutation(entity:string){
  const client=useQueryClient();
  return useMutation({mutationFn:({method,id,values}:{method:'POST'|'PATCH'|'DELETE';id?:string;values?:Record<string,unknown>})=>api(`/api/records/${entity}`,{method,body:JSON.stringify(method==='DELETE'?{id}:{id,values})}),onSuccess:async()=>{await client.invalidateQueries({queryKey:['finances']});toast.success('Dados atualizados.');},onError:(e:Error)=>toast.error(e.message)});
}
