import { randomUUID } from "node:crypto";
import {
  currentMember,
  checkOrigin,
  rateLimit,
  boundedRequest,
  response,
  failure,
  checkDatabase,
  ApiError,
} from "@/lib/api";
import { itemInput } from "@/lib/validation";
import { cleanPhoto } from "@/lib/uploads";
import { serviceClient } from "@/lib/supabase/server";
export async function GET() {
  try {
    const { supabase } = await currentMember();
    const { data, error } = await supabase
      .from("items")
      .select(
        "id,name,category,brand,model,colour,status,created_at,item_images(image_path)",
      )
      .order("created_at", { ascending: false });
    checkDatabase(error);
    const items = await Promise.all(
      (data || []).map(async (item) => {
        const path = item.item_images[0]?.image_path;
        const { data: photo } = path
          ? await supabase.storage
              .from("item-images")
              .createSignedUrl(path, 300)
          : { data: null };
        return { ...item, item_images: undefined, photo: photo?.signedUrl };
      }),
    );
    return response({ items });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  const uploaded: string[] = [];
  try {
    checkOrigin(request);
    const { supabase, user } = await currentMember();
    await rateLimit("register:" + user.id, 20, 3600);
    const form = await (
      await boundedRequest(request, 10 * 1024 * 1024)
    ).formData();
    const input = itemInput.parse(
      Object.fromEntries(
        ["name", "category", "detail", "brand", "model", "colour"].map((k) => [
          k,
          form.get(k) || undefined,
        ]),
      ),
    );
    const files = form.getAll("photos");
    if (
      files.length < 2 ||
      files.length > 3 ||
      files.some((f) => !(f instanceof File))
    )
      throw new ApiError(400, "Upload two or three item photos.");
    for (const file of files as File[]) {
      const bytes = await cleanPhoto(file);
      const path = `${user.id}/${randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("item-images")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      checkDatabase(error);
      uploaded.push(path);
    }
    const { data, error } = await supabase.rpc("register_item", {
      p_name: input.name,
      p_category: input.category,
      p_detail: input.detail,
      p_images: uploaded,
      p_brand: input.brand || null,
      p_model: input.model || null,
      p_colour: input.colour || null,
    });
    checkDatabase(error);
    return response({ id: data }, 201);
  } catch (e) {
    if (uploaded.length)
      await serviceClient().storage.from("item-images").remove(uploaded);
    return failure(e);
  }
}
