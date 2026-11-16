import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnvironment } from "@/lib/validations/environment";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnvironment();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path=request.nextUrl.pathname;
  const authPages=['/login','/cadastro','/recuperar-senha'];
  const publicPath=path==='/manifest.webmanifest'||path==='/'||authPages.includes(path)||path.startsWith('/auth/')||path.startsWith('/api/auth/')||path==='/api/health';
  if ((!user&&!publicPath&&!path.startsWith('/api/')) || (user&&authPages.includes(path))) {
    const target=request.nextUrl.clone();target.pathname=user?'/dashboard':'/login';target.search='';
    const redirected=NextResponse.redirect(target);
    response.cookies.getAll().forEach(cookie=>redirected.cookies.set(cookie));
    redirected.headers.set('Cache-Control','private, no-store');
    return redirected;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
