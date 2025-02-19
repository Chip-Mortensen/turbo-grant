import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();
  const next = requestUrl.searchParams.get("next")?.toString();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      return NextResponse.redirect(
        `${origin}/sign-in?message=Auth session error: ${error.message}&type=error`
      );
    }

    // Handle password reset callback
    if (redirectTo?.includes("reset-password")) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    // Handle email verification callback
    if (next) {
      return NextResponse.redirect(
        `${origin}/sign-in?message=Email verified successfully. Please sign in.&type=success`
      );
    }

    // Default redirect
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // No code, redirect to sign-in
  return NextResponse.redirect(`${origin}/sign-in?message=No auth code provided&type=error`);
}
