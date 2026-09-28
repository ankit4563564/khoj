import { NextResponse } from "next/server";
import { HttpError, sessionUser } from "@/lib/rvu/auth";
import { guestId } from '@/lib/rvu/guest';
import { one } from "@/lib/rvu/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await sessionUser();
    const actor = user?.verified ? user.id : await guestId();
    if(!actor)throw new HttpError(401,'Authentication required.');
    const { id } = await params;
    const photo = one<{ mime: string; content: Uint8Array; userId: string }>(
      "SELECT * FROM uploads WHERE id=?",
      id,
    );
    if (
      !photo ||
      (photo.userId !== actor &&
        (!user?.verified || !one("SELECT id FROM reports WHERE imageId=?", id)))
    )
      return new NextResponse(null, { status: 404 });
    return new NextResponse(Buffer.from(photo.content), {
      headers: {
        "Content-Type": photo.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return new NextResponse(null, {
      status: e instanceof HttpError ? e.status : 500,
    });
  }
}
