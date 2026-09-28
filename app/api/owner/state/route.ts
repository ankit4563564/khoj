import { currentMember, response, failure, checkDatabase } from "@/lib/api";
export async function GET() {
  try {
    const { supabase } = await currentMember();
    const results = await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("recovery").select("*"),
      supabase.from("rewards").select("*"),
      supabase.rpc("unclaimed_board"),
    ]);
    results.forEach((r) => checkDatabase(r.error));
    const recoveries = await Promise.all(
      (results[1].data || []).map(async (r) => {
        const { data, error } = await supabase.rpc("get_handover", {
          p_recovery: r.id,
        });
        checkDatabase(error);
        return { ...r, location: data?.[0]?.location };
      }),
    );
    return response({
      matches: results[0].data,
      recoveries,
      rewards: results[2].data,
      board: results[3].data,
    });
  } catch (e) {
    return failure(e);
  }
}
