import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { account, one, run } from "./db";
import type { Account } from "./types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const secret = () => randomBytes(32).toString("hex");
export const domains = () =>
  (process.env.RVU_EMAIL_DOMAINS || "rvu.edu.in")
    .split(",")
    .map((s) => s.trim().toLowerCase());
export const emailAllowed = (email: string) => {
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  const configured = domains();
  return configured.some((d) => domain === d || domain.endsWith(`.${d}`));
};
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}
export async function passwordHash(password: string) {
  const salt = secret();
  return `${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) {
    await derive(password, "constant-time-dummy-salt");
    return false;
  }
  const candidate = await derive(password, salt);
  const expected = Buffer.from(key, "hex");
  return (
    expected.length === candidate.length && timingSafeEqual(expected, candidate)
  );
}
export async function sessionUser(): Promise<Account | undefined> {
  const token = (await cookies()).get("rvu_session")?.value;
  if (!token) return undefined;
  const session = one<{ userId: string }>(
    "SELECT userId FROM sessions WHERE token=? AND expires>?",
    hash(token),
    Date.now(),
  );
  return session ? account(session.userId) : undefined;
}
export async function requireUser(staff = false): Promise<Account> {
  const user = await sessionUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  if (!user.verified)
    throw new HttpError(403, "Verify your university email to continue.");
  if (staff && user.role !== "staff")
    throw new HttpError(
      403,
      "This action is reserved for authorised RVU staff.",
    );
  return user;
}
export async function createSession(userId: string): Promise<string> {
  const token = secret();
  run("DELETE FROM sessions WHERE expires<?", Date.now());
  run(
    "INSERT INTO sessions VALUES (?,?,?)",
    hash(token),
    userId,
    Date.now() + 7 * 86400000,
  );
  try {
    const jar = await cookies();
    jar.set("rvu_session", token, {
      httpOnly: true,
      secure: process.env.APP_URL?.startsWith("https://") || false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });
  } catch {
    // If running in a context where cookies() cannot be mutated directly,
    // caller can use the returned token to set the cookie on their response.
  }
  return token;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("rvu_session")?.value;
  if (token) run("DELETE FROM sessions WHERE token=?", hash(token));
  jar.delete("rvu_session");
}
export function originCheck(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // Allow requests without Origin header (e.g. standard same-origin navigation)

  const reqOrigin = new URL(req.url).origin;
  const host = req.headers.get("host") || new URL(req.url).host;
  const hostOriginHttp = `http://${host}`;
  const hostOriginHttps = `https://${host}`;

  const allowedOrigins = new Set<string>([reqOrigin, hostOriginHttp, hostOriginHttps]);
  if (process.env.APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.APP_URL).origin);
    } catch {
      // ignore invalid APP_URL format
    }
  }

  // In development, also allow any localhost/127.0.0.1 origin
  const isLocalDev =
    process.env.NODE_ENV !== "production" ||
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);

  if (isLocalDev) {
    try {
      const parsedOrigin = new URL(origin);
      if (
        parsedOrigin.hostname === "localhost" ||
        parsedOrigin.hostname === "127.0.0.1"
      ) {
        return;
      }
    } catch {
      // ignore
    }
  }

  if (!allowedOrigins.has(origin)) {
    throw new HttpError(403, "Request origin was not accepted.");
  }
}
export function rateLimit(key: string, max = 10, seconds = 900) {
  const time = Date.now();
  run("DELETE FROM rate_limits WHERE expires<?", time);
  run(
    "INSERT INTO rate_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
    key,
    time + seconds * 1000,
  );
  const row = one<{ count: number }>(
    "SELECT count FROM rate_limits WHERE key=?",
    key,
  )!;
  if (row.count > max)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}
export function text(value: unknown, name: string, min = 1, max = 200): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    throw new HttpError(400, `${name} must contain ${min}–${max} characters.`);
  return value.trim();
}
export function choice<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T))
    throw new HttpError(400, `Select a valid ${name}.`);
  return value as T;
}
