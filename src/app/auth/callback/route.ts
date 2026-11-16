import { NextRequest,NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
const destinations=new Set(['/dashboard','/atualizar-senha','/configuracoes']);
export async function GET(request:NextRequest){
  const code=request.nextUrl.searchParams.get('code');
  const next=request.nextUrl.searchParams.get('next')||'/dashboard';
  const origin=new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
  if(code){const supabase=await createClient();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(destinations.has(next)?next:'/dashboard',origin));}
  return NextResponse.redirect(new URL('/login?error=link',origin));
}
