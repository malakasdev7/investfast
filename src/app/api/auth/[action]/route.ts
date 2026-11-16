import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiError,authenticated,checkOrigin,rateLimit } from '@/lib/api';
import { authSchema,loginSchema } from '@/lib/validations/entities';
import { resolveLoginEmail } from '@/lib/supabase/login-identifier';

export async function POST(request:NextRequest,{params}:{params:Promise<{action:string}>}){
  try{
    checkOrigin(request);
    const {action}=await params;
    if(['login','register','recover','delete'].includes(action)){
      rateLimit(request,`auth:${action}`,15,60_000);
    }
    const supabase=await createClient();
    const body=await request.json();
    const origin=new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
    if(action==='login'){
      const credentials=loginSchema.parse(body);
      const email=resolveLoginEmail(credentials.email),password=credentials.password;
      if(!email)throw new Error('E-mail, usuário ou senha inválidos.');
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error) throw new Error(error.code==='email_not_confirmed'?'Confirme seu e-mail antes de entrar.':'E-mail ou senha inválidos.');
    }else if(action==='register'){
      const {email,password,name}=authSchema.required({name:true}).parse(body);
      const {error}=await supabase.auth.signUp({email,password,options:{data:{name},emailRedirectTo:`${origin}/auth/callback?next=/dashboard`}});
      if(error) throw new Error('Não foi possível cadastrar agora. Verifique os dados ou tente novamente mais tarde.');
    }else if(action==='recover'){
      const {email}=z.object({email:z.email()}).parse(body);
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/callback?next=/atualizar-senha`});
      if(error) throw new Error('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
    }else if(action==='password'){
      await authenticated();
      const {password}=authSchema.pick({password:true}).parse(body);
      const {error}=await supabase.auth.updateUser({password});
      if(error) throw new Error('Não foi possível atualizar a senha. Solicite outro link de recuperação.');
    }else if(action==='logout'){
      const {error}=await supabase.auth.signOut();
      if(error) throw new Error('Não foi possível encerrar a sessão.');
    }else if(action==='email'){
      await authenticated();
      const {email}=z.object({email:z.email()}).parse(body);
      const {error}=await supabase.auth.updateUser({email},{emailRedirectTo:`${origin}/auth/callback?next=/configuracoes`});
      if(error) throw new Error('Não foi possível alterar o e-mail.');
    }else if(action==='delete'){
      const {user}=await authenticated();
      const {password,confirmation}=z.object({password:z.string().min(1),confirmation:z.literal('EXCLUIR MINHA CONTA'),confirmed:z.literal(true)}).parse(body);
      const {error:loginError}=await supabase.auth.signInWithPassword({email:user.email!,password});
      if(loginError) throw new Error('Senha incorreta. A conta não foi excluída.');
      let hasMore=true;
      while(hasMore){
        const {data:files,error:filesError}=await supabase.storage.from('investfast-private').list(user.id,{limit:100});
        if(filesError) throw new Error('Não foi possível listar os anexos.');
        hasMore=!!files?.length;
        if(files?.length){const {error}=await supabase.storage.from('investfast-private').remove(files.map(f=>`${user.id}/${f.name}`));if(error)throw new Error('Não foi possível remover os anexos.');}
      }
      const {error}=await supabase.rpc('delete_own_account',{confirmation});
      if(error) throw new Error('Não foi possível excluir a conta. Verifique os anexos e tente novamente.');
      await supabase.auth.signOut({scope:'local'});
    }else throw new Error('Ação inválida.');
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof z.ZodError) return Response.json({error:error.issues.map(i=>i.message).join(' ')},{status:422});
    return apiError(error);
  }
}
