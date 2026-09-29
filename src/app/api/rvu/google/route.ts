import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, domains, emailAllowed, hash, secret } from "@/lib/rvu/auth";
import { id, now, one, run } from "@/lib/rvu/db";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto") || (process.env.VERCEL ? "https" : "http");
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).host;
  const inferredBase = `${forwardedProto}://${forwardedHost}`;
  const base = ((process.env.VERCEL && inferredBase) || process.env.APP_URL || inferredBase).replace(/\/+$/, "");
  const clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const errorRedirect = (message: string) =>
    NextResponse.redirect(`${base}/login?error=${encodeURIComponent(message)}`);

  const url = new URL(req.url);
  const useSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  // If Supabase is configured and this is the initial login click, delegate to Supabase OAuth
  if (useSupabase && !url.searchParams.has("code") && !url.searchParams.has("error")) {
    try {
      const supabase = await createSupabaseServerClient();
      const configuredDomains = domains();
      const queryParams: Record<string, string> = {
        prompt: "select_account",
      };
      if (
        configuredDomains.length === 1 &&
        configuredDomains[0] &&
        !configuredDomains[0].includes("gmail.com")
      ) {
        queryParams.hd = configuredDomains[0];
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${base}/auth/callback`,
          queryParams,
        },
      });
      if (error || !data?.url) {
        return errorRedirect(error?.message || "Could not initialize Google sign-in with Supabase.");
      }
      const cookieStore = await cookies();
      const response = NextResponse.redirect(data.url);
      cookieStore.getAll().forEach((c) => {
        response.cookies.set(c.name, c.value);
      });
      return response;
    } catch (e) {
      console.error("Supabase OAuth start failed:", e);
      return errorRedirect("Could not connect to Supabase authentication.");
    }
  }

  if (!clientId || !clientSecret)
    return errorRedirect(
      "Google sign-in is not configured yet. Configure Supabase or Google credentials in .env.local.",
    );
  const jar = await cookies();
  const redirectUri = `${base}/api/rvu/google`;
  if (!url.searchParams.has("code") && !url.searchParams.has("error")) {
    const state = secret(),
      verifier = secret();
    jar.set("rvu_oauth", JSON.stringify({ state, verifier }), {
      httpOnly: true,
      secure: base.startsWith("https://"),
      sameSite: "lax",
      path: "/api/rvu/google",
      maxAge: 600,
    });
    const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    const params: Record<string, string> = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: Buffer.from(hash(verifier), "hex").toString("base64url"),
      code_challenge_method: "S256",
      prompt: "select_account",
    };
    const configuredDomains = domains();
    if (
      configuredDomains.length === 1 &&
      configuredDomains[0] &&
      !configuredDomains[0].includes("gmail.com")
    ) {
      params.hd = configuredDomains[0];
    }
    target.search = new URLSearchParams(params).toString();
    return NextResponse.redirect(target);
  }
  try {
    const stored = JSON.parse(jar.get("rvu_oauth")?.value || "{}");
    jar.set("rvu_oauth", "", { path: "/api/rvu/google", maxAge: 0 });
    if (
      !stored.state ||
      url.searchParams.get("state") !== stored.state ||
      url.searchParams.has("error")
    )
      return errorRedirect(
        "Google sign-in was cancelled or expired. Try again.",
      );
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code: url.searchParams.get("code")!,
        code_verifier: stored.verifier,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) throw new Error("Token exchange failed");
    const token = await tokenResponse.json();
    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!profileResponse.ok) throw new Error("Profile request failed");
    const profile = await profileResponse.json();
    if (
      !profile.email_verified ||
      typeof profile.sub !== "string" ||
      !emailAllowed(String(profile.email).toLowerCase())
    )
      return errorRedirect(
        `Use your verified university Google account (@${domains().join(", @")}).`,
      );
    let user = one<{
      id: string;
      googleId: string | null;
      verified: number;
      role: string;
    }>(
      "SELECT id,googleId,verified,role FROM users WHERE email=?",
      profile.email.toLowerCase(),
    );
    if (user && user.googleId && user.googleId !== profile.sub)
      return errorRedirect(
        "This email is linked to a different Google account.",
      );
    if (user && !user.verified) {
      // Google proves control of the email; invalidate any pre-verification sessions/password.
      run("DELETE FROM sessions WHERE userId=?", user.id);
      run("UPDATE users SET password=NULL WHERE id=?", user.id);
    }
    if (!user) {
      const userId = id("user");
      run(
        "INSERT INTO users (id,name,email,studentId,department,verified,googleId,createdAt) VALUES (?,?,?,?,?,1,?,?)",
        userId,
        String(profile.name || "RVU Student").slice(0, 100),
        profile.email.toLowerCase(),
        "",
        "Other",
        profile.sub,
        now(),
      );
      user = { id: userId, googleId: profile.sub, verified: 1, role: "student" };
    } else
      run(
        "UPDATE users SET googleId=?,verified=1 WHERE id=?",
        profile.sub,
        user.id,
      );
    const sessionToken = await createSession(user.id);
    const destination = user.role === "staff" ? "/hod" : "/dashboard";
    const redirectRes = NextResponse.redirect(`${base}${destination}`);
    redirectRes.cookies.set("rvu_session", sessionToken, {
      httpOnly: true,
      secure: base.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });
    return redirectRes;
  } catch {
    return errorRedirect(
      "Google sign-in could not be completed. Please try again.",
    );
  }
}
