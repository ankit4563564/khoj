import { currentMember, response, failure, checkDatabase } from "@/lib/api";
import { serviceClient } from "@/lib/supabase/server";
export async function GET() {
  try {
    const { supabase } = await currentMember();
    const { data, error } = await supabase.rpc("review_queue");
    checkDatabase(error);
    const queue = await Promise.all(
      (data || []).map(async (row: { found_image_path: string }) => {
        const { data: image, error: imageError } = await serviceClient()
          .storage.from("found-images")
          .createSignedUrl(row.found_image_path, 120);
        checkDatabase(imageError);
        return { ...row, found_image_path: undefined, photo: image?.signedUrl };
      }),
    );
    return response({ queue });
  } catch (e) {
    return failure(e);
  }
}
