import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // API routes should bypass middleware completely
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  if (isApiRoute) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  // Public routes that don't require authentication or organization selection
  const isPublicRoute = request.nextUrl.pathname.startsWith("/sign-in") || 
                         request.nextUrl.pathname.startsWith("/sign-up") ||
                         request.nextUrl.pathname.startsWith("/auth/") ||
                         request.nextUrl.pathname === "/";

  // Routes that require authentication but not organization selection
  const isOrganizationRoute = request.nextUrl.pathname === "/select-organization" ||
                              request.nextUrl.pathname.startsWith("/projects/create/organization");
                          
  if (isPublicRoute) {
    return response;
  }

  // Redirect to sign-in if not authenticated
  if (userError || !user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // If user is authenticated but doesn't have an organization, redirect to organization selection
  // This applies to all protected routes, not just dashboard
  if (!isOrganizationRoute) {
    // Check if user has selected an organization
    const { data: profile } = await supabase
      .from("users")
      .select("institution_id")
      .eq("id", user.id)
      .single();
    
    if (!profile?.institution_id) {
      return NextResponse.redirect(new URL("/select-organization", request.url));
    }
  }

  return response;
};
 