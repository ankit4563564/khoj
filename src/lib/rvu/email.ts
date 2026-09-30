import { hash, secret, HttpError } from "./auth";
import { run } from "./db";

export async function sendAccountLink(
  userId: string,
  email: string,
  purpose: "verify" | "reset",
  origin: string,
) {
  const token = secret();
  await run("DELETE FROM tokens WHERE \"userId\"=? AND purpose=?", userId, purpose);
  await run(
    'INSERT INTO tokens VALUES (?,?,?,?)',
    hash(token),
    userId,
    purpose,
    Date.now() + 3_600_000,
  );
  const url = `${process.env.APP_URL || origin}/${purpose}?token=${token}`;
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV !== "production") return url;
    throw new HttpError(
      503,
      "University email delivery is not configured. Please contact the site administrator.",
    );
  }
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject:
        purpose === "verify"
          ? "Verify your KHOJ RVU email"
          : "Reset your KHOJ RVU password",
      text: `${purpose === "verify" ? "Verify your university email" : "Reset your password"} using this link (valid for one hour):\n${url}\n\nIf you did not request this, ignore this email.`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok)
    throw new HttpError(
      503,
      "Email could not be sent. Please try again shortly.",
    );
  return undefined;
}
