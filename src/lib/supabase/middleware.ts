import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Check user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmRoute = request.nextUrl.pathname.startsWith("/adm");
  const isLoginPage = request.nextUrl.pathname === "/adm/login";

  if (isAdmRoute && !isLoginPage) {
    if (!user) {
      const loginUrl = new URL("/adm/login", request.url);
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isLoginPage && user) {
    return NextResponse.redirect(new URL("/adm", request.url));
  }

  return supabaseResponse;
}
