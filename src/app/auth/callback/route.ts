import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSession, domains, emailAllowed } from "@/lib/rvu/auth";
import { id, now, one, run } from "@/lib/rvu/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const errorRedirect = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  if (!code) {
    return errorRedirect("Authentication was cancelled or failed.");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return errorRedirect(error?.message || "Failed to exchange authorization code.");
    }

    const { user: authUser } = data;
    const email = authUser.email?.toLowerCase();

    if (!email || !emailAllowed(email)) {
      await supabase.auth.signOut();
      return errorRedirect(
        `Please sign in with your verified university account (@${domains().join(", @")}).`
      );
    }

    // Sync with KHOJ internal user store
    let user = one<{
      id: string;
      googleId: string | null;
      verified: number;
      role: string;
    }>(
      "SELECT id,googleId,verified,role FROM users WHERE email=?",
      email,
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
        "UPDATE users SET googleId=?,verified=1 WHERE id=?",
        authUser.id,
        user.id,
      );
    }

    await createSession(user.id);

    const destination = user.role === "staff" ? "/hod" : next;
    return NextResponse.redirect(`${origin}${destination}`);
  } catch (err) {
    console.error("Auth callback error:", err);
    return errorRedirect("Authentication error occurred. Please try again.");
  }
}
