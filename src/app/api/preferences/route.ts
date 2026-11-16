import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticated,apiError,checkOrigin } from '@/lib/api';
export async function PATCH(request:NextRequest){
  try{checkOrigin(request);const {supabase,user}=await authenticated();const values=z.object({theme:z.enum(['light','dark','system'])}).strict().parse(await request.json());const {error}=await supabase.from('profiles').update(values).eq('user_id',user.id);if(error)throw new Error('Não foi possível salvar o tema.');return Response.json({ok:true});}catch(e){return apiError(e);}
}
