import { NextRequest,NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request:NextRequest){
  const token_hash=request.nextUrl.searchParams.get('token_hash');
  const type=request.nextUrl.searchParams.get('type');
  const origin=new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
  if(token_hash&&(type==='email'||type==='recovery'||type==='email_change')){const supabase=await createClient();const {error}=await supabase.auth.verifyOtp({token_hash,type});if(!error)return NextResponse.redirect(new URL(type==='recovery'?'/atualizar-senha':'/dashboard',origin));}
  return NextResponse.redirect(new URL('/login?error=link',origin));
}
