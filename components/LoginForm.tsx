"use client";
import { useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { collegeEmail } from "@/lib/validation";
export default function LoginForm({
  configured,
  expired,
}: {
  configured: boolean;
  expired: boolean;
}) {
  const [error, setError] = useState(
      expired
        ? "That sign-in link has expired or is invalid. Request a new one."
        : "",
    ),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form form-panel login-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const email = collegeEmail.safeParse(
          new FormData(e.currentTarget).get("email"),
        );
        if (!email.success) {
          setError("Use your @rvu.edu.in college email address.");
          return;
        }
        setBusy(true);
        try {
          const r = await fetch("/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.data }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          setSent(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not send the link.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Mail size={27} color="var(--accent)" />
      <h2>
        {sent ? "Check your college inbox." : "Your campus. Your things."}
      </h2>
      {sent ? (
        <p className="muted">
          Use the secure link we sent to sign in. Open it in this browser to
          finish.
        </p>
      ) : (
        <>
          <p className="muted">
            Sign in with your RV University email. No password to remember.
          </p>
          <label>
            College email
            <input
              type="email"
              name="email"
              placeholder="you@rvu.edu.in"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <button className="primary" disabled={busy || !configured}>
            {busy ? "Sending sign-in link…" : "Email me a sign-in link"}
            <ArrowRight size={17} />
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!configured && (
        <p className="notice">
          Email sign-in is waiting for the campus Supabase connection. No email
          will be sent yet.
        </p>
      )}
      <p className="small muted">
        <ShieldCheck size={16} /> Only verified @rvu.edu.in addresses can enter
        the owner workspace.
      </p>
    </form>
  );
}
