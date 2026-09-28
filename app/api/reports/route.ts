import { randomBytes, randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import {
  requireConfig,
  checkOrigin,
  boundedRequest,
  rateLimit,
  clientRateId,
  response,
  failure,
  checkDatabase,
  ApiError,
} from "@/lib/api";
import { serviceClient } from "@/lib/supabase/server";
import { campusLocation } from "@/lib/validation";
import { cleanPhoto } from "@/lib/uploads";
export async function POST(request: Request) {
  let path: string | undefined;
  try {
    checkOrigin(request);
    requireConfig();
    await rateLimit("report:" + clientRateId(request), 8, 3600);
    const form = await (
      await boundedRequest(request, 4 * 1024 * 1024)
    ).formData();
    const location = campusLocation.parse(form.get("location"));
    const phone = z
      .string()
      .regex(/^[+0-9 ()-]{10,20}$/)
      .optional()
      .parse(form.get("phone") || undefined);
    const file = form.get("photo");
    if (!(file instanceof File))
      throw new ApiError(400, "Add a photo of the found item.");
    const bytes = await cleanPhoto(file);
    const token = randomBytes(32).toString("base64url"),
      reportId = randomUUID();
    path = reportId + ".jpg";
    const client = serviceClient();
    const { error: uploadError } = await client.storage
      .from("found-images")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    checkDatabase(uploadError);
    const { error } = await client
      .from("found_reports")
      .insert({
        id: reportId,
        image_path: path,
        location,
        rough_location:
          location === "Library"
            ? "Library area"
            : location === "Academic block"
              ? "Academic area"
              : "Campus area",
        finder_phone: phone || null,
        finder_token_hash: createHash("sha256").update(token).digest("hex"),
        status: "UNCLAIMED",
      });
    checkDatabase(error);
    return response({ reportId, token, status: "UNCLAIMED" }, 201);
  } catch (e) {
    if (path) await serviceClient().storage.from("found-images").remove([path]);
    return failure(e);
  }
}
