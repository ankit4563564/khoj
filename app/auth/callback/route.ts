import { NextResponse } from "next/server";
import { backendConfigured, userClient } from "@/lib/supabase/server";
import { collegeEmail } from "@/lib/validation";
import { siteOrigin } from "@/lib/api";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code && backendConfigured()) {
    const supabase = await userClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      if (
        data.user?.email_confirmed_at &&
        collegeEmail.safeParse(data.user.email).success
      )
        return NextResponse.redirect(siteOrigin() + "/campus");
      await supabase.auth.signOut();
    }
  }
  return NextResponse.redirect(siteOrigin() + "/login?error=expired");
}
