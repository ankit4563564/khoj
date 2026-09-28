import { createHash } from "node:crypto";
import {
  requireConfig,
  checkOrigin,
  readJson,
  rateLimit,
  clientRateId,
  response,
  failure,
  checkDatabase,
  ApiError,
} from "@/lib/api";
import { serviceClient } from "@/lib/supabase/server";
import { finderInput } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    requireConfig();
    await rateLimit("finder:" + clientRateId(request), 60, 3600);
    const input = finderInput.parse(await readJson(request));
    const hash = createHash("sha256").update(input.token).digest("hex");
    const client = serviceClient();
    const { data: report, error } = await client
      .from("found_reports")
      .select("id,status")
      .eq("id", input.reportId)
      .eq("finder_token_hash", hash)
      .maybeSingle();
    checkDatabase(error);
    if (!report) throw new ApiError(404, "This finder link is not valid.");
    if (input.action === "confirm_return") {
      const { data, error } = await client.rpc("confirm_finder_return", {
        p_report: input.reportId,
        p_token_hash: hash,
      });
      checkDatabase(error);
      return response({ status: data });
    }
    if (input.action === "confirm_reward") {
      const { error } = await client.rpc("confirm_finder_reward", {
        p_report: input.reportId,
        p_token_hash: hash,
      });
      checkDatabase(error);
      return response({ ok: true });
    }
    return response(report);
  } catch (e) {
    return failure(e);
  }
}
