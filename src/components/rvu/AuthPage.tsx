"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Mark } from "./Shell";
import { usePortal } from "./PortalProvider";
import { ErrorBox } from "./Common";
import { departments } from "@/lib/rvu/types";
export default function AuthPage({
  mode,
}: {
  mode: "login" | "signup" | "forgot" | "reset" | "verify";
}) {
  const { data, act } = usePortal(),
    router = useRouter();
  const [role, setRole] = useState("student"),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [devLink, setDevLink] = useState(""),
    [token, setToken] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setToken(query.get("token") || "");
    setError(query.get("error") || "");
  }, []);
  const title = {
    login: "Log into KHOJ",
    signup: "Create your KHOJ account",
    forgot: "Forgot your password?",
    reset: "Choose a new password",
    verify: "Verify your university email",
  }[mode];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      const result = await act(mode, { ...fields, role, token });
      if (mode === "signup" || mode === "forgot") {
        setMessage(result.message || "Check your email.");
        setDevLink(result.developmentLink || "");
      } else {
        router.push(role === "staff" ? "/hod" : "/dashboard");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function onGoogleClick(e: React.MouseEvent) {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      e.preventDefault();
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              prompt: "select_account",
              hd: "rvu.edu.in",
            },
          },
        });
        if (oauthError) setError(oauthError.message);
      } catch (err) {
        console.error(err);
        window.location.href = "/api/rvu/google";
      }
    }
  }
  return (
    <div className="rv-auth-page">
      <div className="rv-auth-top">
        <Link href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? "CREATE ACCOUNT" : "LOG IN"}{" "}
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="rv-auth">
        <Mark large />
        <span className="rv-eyebrow">RV UNIVERSITY · LOST & FOUND</span>
        <h1>{title}</h1>
        <p className="rv-auth-intro">
          {mode === "signup"
            ? "Your university email. A more connected campus."
            : mode === "login"
              ? "Welcome back. Let’s find what’s missing."
              : mode === "forgot"
                ? "We’ll send a reset link to your university email."
                : mode === "verify"
                  ? "Confirm your email to join the RVU campus community."
                  : "Use at least 10 characters for your new password."}
        </p>
        <ErrorBox message={error} />
        {message ? (
          <div className="rv-auth-success">
            <CheckCircle2 size={36} />
            <h2>Check your inbox</h2>
            <p role="status">{message}</p>
            {devLink && (
              <div className="rv-dev-note">
                <strong>Verification link</strong>
                <span>
                  Email is not connected here. Use this link to continue.
                </span>
                <Link href={devLink}>
                  Open {mode === "signup" ? "verification" : "password reset"}{" "}
                  link →
                </Link>
              </div>
            )}
            <Link className="rv-text-button" href="/login">
              Back to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            {mode === "login" && (
              <div className="rv-segment" aria-label="Account role">
                <button
                  type="button"
                  aria-pressed={role === "student"}
                  className={role === "student" ? "selected" : ""}
                  onClick={() => setRole("student")}
                >
                  Student Login
                </button>
                <button
                  type="button"
                  aria-pressed={role === "staff"}
                  className={role === "staff" ? "selected" : ""}
                  onClick={() => setRole("staff")}
                >
                  Staff Login
                </button>
              </div>
            )}
            {["login", "signup", "forgot"].includes(mode) && (
              <label className="rv-field">
                UNIVERSITY EMAIL ADDRESS
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@rvu.edu.in"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode === "signup" && (
              <>
                <label className="rv-field">
                  FULL NAME
                  <input
                    name="name"
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label className="rv-field">
                  STUDENT / REGISTER NUMBER
                  <input
                    name="studentId"
                    placeholder="Your RVU student ID"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </label>
                <label className="rv-field">
                  SCHOOL
                  <select name="department" defaultValue="" required>
                    <option value="" disabled>
                      Select your school
                    </option>
                    {departments.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {["login", "signup", "reset"].includes(mode) && (
              <label className="rv-field">
                <span className="rv-between">
                  PASSWORD
                  <button
                    type="button"
                    className="rv-text-button"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
                <input
                  name="password"
                  aria-label="Password"
                  type={show ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Your password"
                      : "At least 10 characters"
                  }
                  required
                  minLength={mode === "login" ? 1 : 10}
                  maxLength={128}
                />
              </label>
            )}
            {mode === "login" && (
              <Link className="rv-forgot" href="/forgot">
                Forgot password?
              </Link>
            )}
            <button
              className="rv-button primary rv-submit"
              disabled={
                busy || ((mode === "reset" || mode === "verify") && !token)
              }
            >
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? `LOG IN AS ${role === "staff" ? "STAFF" : "STUDENT"}`
                  : mode === "signup"
                    ? "CREATE ACCOUNT & CONTINUE"
                    : mode === "forgot"
                      ? "SEND RESET LINK"
                      : mode === "reset"
                        ? "SAVE NEW PASSWORD"
                        : "VERIFY EMAIL & CONTINUE"}{" "}
              {!busy && <ArrowUpRight size={16} />}
            </button>
            {["login", "signup"].includes(mode) && (
              <>
                <div className="rv-divider">
                  <span>OR</span>
                </div>
                {data.config.google ? (
                  <a
                    className="rv-button rv-google"
                    href="/api/rvu/google"
                    onClick={onGoogleClick}
                  >
                    <span className="rv-google-g">G</span>Continue with Google
                  </a>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rv-button rv-google"
                      disabled
                    >
                      <span className="rv-google-g">G</span>Continue with Google
                    </button>
                    <p className="rv-helper center">
                      Google sign-in is not set up yet. Use your email and
                      password.
                    </p>
                  </>
                )}
                <p className="rv-auth-switch">
                  {mode === "login"
                    ? "New to KHOJ?"
                    : "Already have an account?"}{" "}
                  <Link href={mode === "login" ? "/signup" : "/login"}>
                    {mode === "login" ? "Create an account" : "Log in here"}
                  </Link>
                </p>
              </>
            )}
          </form>
        )}
        <div className="rv-auth-foot">
          {mode === "signup"
            ? "Student accounts only. Staff accounts are set up by campus staff."
            : "Private ownership details stay between you and authorised staff."}
        </div>
      </div>
    </div>
  );
}
