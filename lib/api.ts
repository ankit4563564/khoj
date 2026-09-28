import "server-only";
import { createHmac } from "node:crypto";
import { ZodError } from "zod";
import {
  backendConfigured,
  serviceClient,
  userClient,
} from "./supabase/server";
import { collegeEmail } from "./validation";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireConfig() {
  if (!backendConfigured())
    throw new ApiError(
      503,
      "The campus service is not connected yet. You can explore the local demo.",
    );
}
export function siteOrigin() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
    .origin;
}
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== siteOrigin())
    throw new ApiError(403, "This request must come from the KHOJ site.");
}
export async function currentMember() {
  requireConfig();
  const supabase = await userClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (
    error ||
    !user?.email_confirmed_at ||
    !collegeEmail.safeParse(user.email).success
  )
    throw new ApiError(401, "Sign in with your verified @rvu.edu.in email.");
  return { supabase, user };
}
export async function rateLimit(
  bucket: string,
  limit: number,
  seconds: number,
) {
  const digest = createHmac("sha256", process.env.RATE_LIMIT_SECRET!)
    .update(bucket)
    .digest("hex");
  const { data, error } = await serviceClient().rpc("consume_rate_limit", {
    p_bucket: digest,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  if (error) throw new ApiError(503, "Please try again in a moment.");
  if (!data)
    throw new ApiError(429, "Too many requests. Please try again later.");
}
export function clientRateId(request: Request) {
  return process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
        "unknown"
    : "local-shared";
}
export async function boundedRequest(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > limit) throw new ApiError(413, "Upload is too large.");
  if (!request.body) throw new ApiError(400, "Request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new ApiError(413, "Upload is too large.");
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks);
  return new Request(request.url, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
    },
    body,
  });
}
export async function readJson(request: Request) {
  const req = await boundedRequest(request, 16000);
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Invalid request.");
  }
}
export function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return response({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return response(
      { error: error.issues[0]?.message || "Check the submitted fields." },
      400,
    );
  return response(
    { error: "The request could not be completed. Please try again." },
    500,
  );
}
export function checkDatabase(
  error: { code?: string; message?: string } | null,
) {
  if (!error) return;
  if (error.code === "42501")
    throw new ApiError(403, "You do not have access to this action.");
  if (error.code === "23505")
    throw new ApiError(409, "This item or claim has already been recorded.");
  if (error.code?.startsWith("23"))
    throw new ApiError(
      409,
      "This action is not valid for the current case. Check your details and try again.",
    );
  throw new ApiError(
    503,
    "The campus service could not complete this request.",
  );
}
