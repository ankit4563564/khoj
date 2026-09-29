import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSession, domains, emailAllowed } from "@/lib/rvu/auth";
import { id, now, one, run } from "@/lib/rvu/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const authError = searchParams.get("error");
  const authErrorDesc = searchParams.get("error_description");

  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host");
  const siteBase = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  const errorRedirect = (message: string) =>
    NextResponse.redirect(
      `${siteBase}/login?error=${encodeURIComponent(message)}`
    );

  if (authError || authErrorDesc) {
    return errorRedirect(
      authErrorDesc || authError || "Authentication was cancelled or failed."
    );
  }

  if (!code) {
    return errorRedirect("Authentication was cancelled or authorization code is missing.");
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration:", {
        hasUrl: Boolean(supabaseUrl),
        hasKey: Boolean(supabaseKey),
      });
      return errorRedirect(
        "Supabase configuration is missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
      );
    }

    const cookiesToSetOnRedirect: Array<{
      name: string;
      value: string;
      options: any;
    }> = [];

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToSetOnRedirect.push({ name, value, options });
          });
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.user) {
      console.error("Supabase code exchange error:", error);
      return errorRedirect(error?.message || "Failed to exchange authorization code for a session.");
    }

    const { user: authUser } = data;
    const email = authUser.email?.toLowerCase();

    if (!email || !emailAllowed(email)) {
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn("SignOut warning for unauthorized domain:", signOutErr);
      }
      return errorRedirect(
        `Please sign in with your verified university account (@${domains().join(", @")}).`
      );
    }

    // Sync with KHOJ internal user store (lookup by email OR existing googleId)
    let user = one<{
      id: string;
      googleId: string | null;
      verified: number;
      role: string;
    }>(
      "SELECT id,googleId,verified,role FROM users WHERE email=? OR googleId=?",
      email,
      authUser.id,
    );

    if (user && !user.verified) {
      run("DELETE FROM sessions WHERE userId=?", user.id);
      run("UPDATE users SET password=NULL WHERE id=?", user.id);
    }

    if (!user) {
      const userId = id("user");
      const name =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        "RVU Student";
      run(
        "INSERT INTO users (id,name,email,studentId,department,verified,googleId,createdAt) VALUES (?,?,?,?,?,1,?,?)",
        userId,
        String(name).slice(0, 100),
        email,
        "",
        "Other",
        authUser.id,
        now(),
      );
      user = { id: userId, googleId: authUser.id, verified: 1, role: "student" };
    } else {
      run(
        "UPDATE users SET googleId=?,verified=1,email=? WHERE id=?",
        authUser.id,
        email,
        user.id,
      );
    }

    const sessionToken = await createSession(user.id);

    const destination = next;
    const redirectResponse = NextResponse.redirect(`${siteBase}${destination}`);

    // Set rvu_session cookie directly on the redirect response
    redirectResponse.cookies.set("rvu_session", sessionToken, {
      httpOnly: true,
      secure: siteBase.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });

    // Ensure all cookies set during the Supabase exchange are copied over to the redirect response
    cookiesToSetOnRedirect.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });

    return redirectResponse;
  } catch (err) {
    console.error("Auth callback exception:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Authentication error occurred. Please try again.";
    return errorRedirect(msg);
  }
}
