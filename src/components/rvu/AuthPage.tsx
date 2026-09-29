"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Sparkles } from "lucide-react";
import { Mark } from "./Shell";
import { usePortal } from "./PortalProvider";
import { ErrorBox } from "./Common";

export default function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "signup" | "forgot" | "reset" | "verify";
}) {
  const { data } = usePortal(),
    router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setError(query.get("error") || "");
  }, []);

  async function handleGoogleSignIn(e: React.MouseEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const origin = window.location.origin;
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${origin}/auth/callback`,
            queryParams: {
              prompt: "select_account",
              hd: "rvu.edu.in",
            },
          },
        });
        if (oauthError) {
          setError(oauthError.message);
          setBusy(false);
        }
        return;
      } catch (err) {
        console.error("Supabase client sign-in error:", err);
      }
    }

    // Direct fallback to server route
    window.location.href = "/api/rvu/google";
  }

  return (
    <div className="rv-auth-page">
      <div className="rv-auth-top">
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={14} /> BACK TO HOME
        </Link>
      </div>

      <div className="rv-auth">
        {/* Campus Photo Header */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 125,
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
            border: "1px solid var(--rv-line)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <img
            src="/images/rvu_campus_hero.jpg"
            alt="RV University Campus"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.65)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.9) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 16,
              right: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <span
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.08em",
                  fontWeight: 750,
                  color: "#34d399",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 8px #10b981",
                  }}
                />
                RV University Campus
              </span>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  color: "#fff",
                  marginTop: 2,
                }}
              >
                KHOJ Lost & Found
              </div>
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Bengaluru
            </span>
          </div>
        </div>

        <Mark large />
        <span className="rv-eyebrow">CAMPUS VERIFIED NETWORK</span>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, marginBottom: 8 }}>
          Sign In to KHOJ
        </h1>
        <p className="rv-auth-intro" style={{ marginBottom: 24 }}>
          Access your reports, register essentials, and recover belongings with your official university credentials.
        </p>

        <ErrorBox message={error} />

        {/* Primary Single Sign-On Button */}
        <div style={{ marginTop: 8, marginBottom: 24 }}>
          <button
            type="button"
            className="rv-button rv-google rv-google-hero-btn"
            onClick={handleGoogleSignIn}
            disabled={busy}
            style={{
              width: "100%",
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              fontSize: "0.98rem",
              fontWeight: 750,
              borderRadius: 12,
              background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
              color: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)",
              cursor: busy ? "wait" : "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            {busy ? (
              <span>Connecting to RVU Google...</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
                <span>Continue with RVU Google Account</span>
              </>
            )}
          </button>

          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--rv-muted)",
              marginTop: 12,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            🔒 Restricted exclusively to official <strong>@rvu.edu.in</strong> university accounts. No password needed.
          </p>
        </div>

        {/* Benefits Cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 18,
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--rv-panel)",
              border: "1px solid var(--rv-line)",
            }}
          >
            <Shield size={18} style={{ color: "var(--rv-blue)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: "0.82rem", display: "block", color: "var(--rv-text)" }}>
                Zero Passwords to Remember
              </strong>
              <span style={{ fontSize: "0.74rem", color: "var(--rv-muted)", lineHeight: 1.4 }}>
                Instant single sign-on authenticated directly by RV University Google Workspace.
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--rv-panel)",
              border: "1px solid var(--rv-line)",
            }}
          >
            <Sparkles size={18} style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: "0.82rem", display: "block", color: "var(--rv-text)" }}>
                Instant Profile & Department Sync
              </strong>
              <span style={{ fontSize: "0.74rem", color: "var(--rv-muted)", lineHeight: 1.4 }}>
                Your student or staff role and verified university email are recognized automatically.
              </span>
            </div>
          </div>
        </div>

        <div className="rv-auth-foot" style={{ marginTop: 28 }}>
          Private ownership details stay between you and authorised RVU campus staff.
        </div>
      </div>
    </div>
  );
}
