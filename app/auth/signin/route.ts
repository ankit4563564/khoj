import { collegeEmail } from "@/lib/validation";
import { userClient } from "@/lib/supabase/server";
import {
  checkOrigin,
  requireConfig,
  readJson,
  rateLimit,
  clientRateId,
  siteOrigin,
  response,
  failure,
  ApiError,
} from "@/lib/api";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await readJson(request);
    const address = collegeEmail.parse(input?.email);
    requireConfig();
    await rateLimit("signin-ip:" + clientRateId(request), 10, 3600);
    await rateLimit("signin-email:" + address, 3, 3600);
    const supabase = await userClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: siteOrigin() + "/auth/callback" },
    });
    if (error)
      throw new ApiError(
        429,
        "A sign-in link could not be sent. Please wait a little and try again.",
      );
    return response({
      message: "Check your college inbox for the sign-in link.",
    });
  } catch (error) {
    return failure(error);
  }
}
