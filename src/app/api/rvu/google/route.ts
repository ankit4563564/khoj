import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, emailAllowed, hash, secret } from "@/lib/rvu/auth";
import { id, now, one, run } from "@/lib/rvu/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const base = process.env.APP_URL || new URL(req.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const errorRedirect = (message: string) =>
    NextResponse.redirect(`${base}/login?error=${encodeURIComponent(message)}`);
  if (!clientId || !clientSecret || !process.env.APP_URL)
    return errorRedirect(
      "Google sign-in is not configured yet. Use your university email and password.",
    );
  const jar = await cookies();
  const url = new URL(req.url),
    redirectUri = `${base}/api/rvu/google`;
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
    target.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: Buffer.from(hash(verifier), "hex").toString("base64url"),
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
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
      return errorRedirect("Use your verified @rvu.edu.in Google account.");
    let user = one<{ id: string; googleId: string | null; verified: number }>(
      "SELECT id,googleId,verified FROM users WHERE email=?",
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
      user = { id: userId, googleId: profile.sub, verified: 1 };
    } else
      run(
        "UPDATE users SET googleId=?,verified=1 WHERE id=?",
        profile.sub,
        user.id,
      );
    await createSession(user.id);
    return NextResponse.redirect(`${base}/dashboard`);
  } catch {
    return errorRedirect(
      "Google sign-in could not be completed. Please try again.",
    );
  }
}
