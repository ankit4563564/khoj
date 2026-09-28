import { NextResponse } from "next/server";
import { HttpError, originCheck, rateLimit, requireUser } from "@/lib/rvu/auth";
import { id, now, run } from "@/lib/rvu/db";
import { finderActor } from '@/lib/rvu/guest';
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    originCheck(req);
    const user = {id:await finderActor(req)};
    rateLimit(`upload:${user.id}`, 40, 3600);
    if (Number(req.headers.get("content-length")) > 6 * 1024 * 1024)
      throw new HttpError(413, "Choose an image smaller than 5 MB.");
    const data = await req.formData(),
      file = data.get("file");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size)
      throw new HttpError(400, "Choose an image smaller than 5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime =
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? "image/jpeg"
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP"
            ? "image/webp"
            : "";
    if (!mime) throw new HttpError(400, "Use a JPEG, PNG or WebP image.");
    const imageId = id("photo");
    run(
      "INSERT INTO uploads VALUES (?,?,?,?,?)",
      imageId,
      user.id,
      mime,
      bytes,
      now(),
    );
    return NextResponse.json({ id: imageId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof HttpError ? error.message : "Photo upload failed.",
      },
      { status: error instanceof HttpError ? error.status : 500 },
    );
  }
}
