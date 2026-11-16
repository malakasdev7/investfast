import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { ProfilePreferences } from '@/components/layout/profile-preferences';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){
  const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login');
  const {data:profile}=await s.from('profiles').select('name').eq('user_id',user.id).single();
  return <AppShell key={user.id} name={profile?.name||''} email={user.email||''}><ProfilePreferences/>{children}</AppShell>;
}
