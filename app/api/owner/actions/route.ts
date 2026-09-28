import {
  currentMember,
  checkOrigin,
  readJson,
  response,
  failure,
  checkDatabase,
  rateLimit,
} from "@/lib/api";
import { actionInput } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { supabase, user } = await currentMember();
    await rateLimit("owner-action:" + user.id, 60, 3600);
    const input = actionInput.parse(await readJson(request));
    let result;
    switch (input.action) {
      case "mark_lost":
        result = await supabase.rpc("mark_item_lost", {
          p_item: input.itemId,
          p_location: input.location || null,
          p_lost_at: input.lostAt || null,
        });
        break;
      case "claim":
        result = await supabase.rpc("submit_claim", {
          p_report: input.reportId,
          p_item: input.itemId,
          p_answer: input.answer,
        });
        break;
      case "verify":
        result = await supabase.rpc("submit_verification", {
          p_match: input.matchId,
          p_answer: input.answer,
        });
        break;
      case "review":
        result = await supabase.rpc("review_claim", {
          p_match: input.matchId,
          p_approve: input.approve,
        });
        break;
      case "confirm_return":
        result = await supabase.rpc("confirm_owner_return", {
          p_recovery: input.recoveryId,
        });
        break;
      case "reward":
        result = await supabase.rpc("set_reward_choice", {
          p_recovery: input.recoveryId,
          p_skip: input.skip,
          p_upi: input.upi || null,
        });
        break;
    }
    checkDatabase(result.error);
    return response({ ok: true, result: result.data });
  } catch (e) {
    return failure(e);
  }
}
