"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { locations } from "@/lib/model";
export default function LiveFinder({
  tracking = false,
}: {
  tracking?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [link, setLink] = useState(""),
    [status, setStatus] = useState(""),
    [credentials, setCredentials] = useState<{
      reportId: string;
      token: string;
    } | null>(null),
    [paid, setPaid] = useState(false);
  async function update(action: string, c = credentials) {
    if (!c) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...c, action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (data.status) setStatus(data.status);
      if (action === "confirm_reward") setPaid(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (tracking) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const reportId = hash.get("reportId"),
        token = hash.get("token");
      if (reportId && token) {
        const c = { reportId, token };
        setCredentials(c);
        void update("status", c);
      } else
        setError(
          "Open the private finder link you saved after submitting a report.",
        );
    }
  }, [tracking]);
  if (tracking)
    return (
      <section className="form-panel login-form form">
        <ShieldCheck color="var(--accent)" size={30} />
        <h2>
          {status === "RETURNED"
            ? "Back where it belongs."
            : "Your good deed, in progress."}
        </h2>
        <p className="muted">
          {status === "HANDOVER"
            ? "Ownership has been verified. Confirm here once you have returned the item."
            : status === "RETURNED"
              ? "Both you and the owner confirmed the return. Thank you for helping."
              : status
                ? "The report is awaiting a verified owner. Keep the item safe."
                : "Checking your private case…"}
        </p>
        {status === "HANDOVER" && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => update("confirm_return")}
          >
            I returned the item <Check size={17} />
          </button>
        )}
        {status === "RETURNED" && !paid && (
          <>
            <p className="small muted">
              If the owner chose to send a thank-you, confirm only after you
              actually receive it.
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => update("confirm_reward")}
            >
              I received the ₹20 thank-you
            </button>
          </>
        )}
        {paid && (
          <p className="positive">Your payment acknowledgement is recorded.</p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {credentials && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => update("status")}
          >
            Refresh case status
          </button>
        )}
      </section>
    );
  if (link)
    return (
      <section className="form-panel login-form form">
        <div className="success-mark">
          <Check />
        </div>
        <h2>A small act. A big difference.</h2>
        <p>
          Your report is saved. Keep the item safe while its owner is verified.
        </p>
        <p className="notice">
          Save this private link. It lets you check the case and confirm the
          handover without signing in. Anyone with the link can act as the
          finder.
        </p>
        <a className="primary" href={link}>
          Open my private case <ArrowRight size={17} />
        </a>
        <label>
          Private finder link
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      </section>
    );
  return (
    <form
      className="form form-panel login-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await fetch("/api/reports", {
            method: "POST",
            body: new FormData(e.currentTarget),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          setLink(
            `${window.location.origin}/finder#reportId=${data.reportId}&token=${data.token}`,
          );
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        A clear photo
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <p className="small muted">
        JPG, PNG or WebP, up to 3 MB. Identifying photos stay private.
      </p>
      <label>
        Where did you find it?
        <select name="location" defaultValue="" required>
          <option value="" disabled>
            Select a campus location
          </option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Phone number · optional
        <input
          name="phone"
          type="tel"
          maxLength={20}
          pattern="[+0-9 ()-]{10,20}"
        />
      </label>
      <p className="small muted">
        A campus reviewer may use this number to coordinate the return.
        Automated SMS is not connected.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy ? "Saving report…" : "Submit found item"}
        <ArrowRight size={17} />
      </button>
      <p className="small muted centered">
        No account. No OTP. Just a little kindness.
      </p>
    </form>
  );
}
