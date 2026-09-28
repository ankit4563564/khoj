import "server-only";
import sharp from "sharp";
import { ApiError } from "./api";
export async function cleanPhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 3 * 1024 * 1024 ||
    file.size === 0
  )
    throw new ApiError(400, "Use a JPG, PNG or WebP photo under 3 MB.");
  try {
    const photo = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
      animated: false,
    });
    const metadata = await photo.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
      throw new Error("Unsupported actual image format");
    return await photo
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ApiError(
      400,
      "The photo could not be decoded. Try another image.",
    );
  }
}
