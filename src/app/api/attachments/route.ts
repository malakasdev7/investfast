import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticated,checkOrigin,apiError } from '@/lib/api';
export async function POST(request:NextRequest){
  try{
    checkOrigin(request);const {supabase,user}=await authenticated();const form=await request.formData();
    const transactionId=z.uuid().parse(form.get('transaction_id')),file=form.get('file');
    if(!(file instanceof File)||!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type)||file.size<1||file.size>5*1024*1024)throw new Error('Envie PDF, PNG, JPEG ou WebP de até 5 MB.');
    const {data:tx}=await supabase.from('transactions').select('id').eq('id',transactionId).eq('user_id',user.id).single();if(!tx)throw new Error('Transação não encontrada.');
    const path=`${user.id}/${crypto.randomUUID()}`;
    const {error:uploadError}=await supabase.storage.from('investfast-private').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw new Error('Falha no envio do arquivo.');
    const {error}=await supabase.from('attachments').insert({transaction_id:transactionId,name:file.name.slice(0,200),path,mime_type:file.type,size_bytes:file.size});
    if(error){await supabase.storage.from('investfast-private').remove([path]);throw new Error('Falha ao vincular o anexo.');}
    return Response.json({ok:true});
  }catch(e){return apiError(e);}
}
export async function GET(request:NextRequest){
  try{const {supabase,user}=await authenticated();const id=z.uuid().parse(request.nextUrl.searchParams.get('id'));const {data}=await supabase.from('attachments').select('path,name').eq('id',id).eq('user_id',user.id).single();if(!data)throw new Error('Anexo não encontrado.');const {data:link,error}=await supabase.storage.from('investfast-private').createSignedUrl(data.path,60,{download:data.name});if(error)throw new Error('Falha ao abrir arquivo.');return Response.json({url:link.signedUrl},{headers:{'Cache-Control':'no-store'}});}catch(e){return apiError(e);}
}
export async function DELETE(request:NextRequest){
  try{checkOrigin(request);const {supabase,user}=await authenticated();const {id}=z.object({id:z.uuid()}).parse(await request.json());const {data}=await supabase.from('attachments').select('path').eq('id',id).eq('user_id',user.id).single();if(!data)throw new Error('Anexo não encontrado.');const {error:removeError}=await supabase.storage.from('investfast-private').remove([data.path]);if(removeError)throw new Error('Falha ao excluir arquivo.');const {error}=await supabase.from('attachments').delete().eq('id',id).eq('user_id',user.id);if(error)throw new Error('Falha ao excluir vínculo.');return Response.json({ok:true});}catch(e){return apiError(e);}
}
