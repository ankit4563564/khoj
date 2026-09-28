import { checkOrigin, requireConfig, response, failure } from "@/lib/api";
import { userClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    requireConfig();
    const supabase = await userClient();
    await supabase.auth.signOut();
    return response({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
