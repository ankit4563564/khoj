"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  MapPin,
  Lock,
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  Sparkles,
  Smartphone,
  Eye,
  Check,
} from "lucide-react";
import { usePortal } from "./PortalProvider";
import { ErrorBox } from "./Common";
import { featureApi } from "./IdentityPage";
import QrInput from "./QrInput";
import { SuccessCheckmark } from "./MotionPrimitives";
import { TRANSITION_NORMAL } from "@/lib/motion";

export function RecoveryPanel() {
  const { data, refresh, toast } = usePortal();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!data.handovers.length) return null;

  async function action(values: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await featureApi("items", values);
      await refresh();
      toast("Recovery status updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="kh-handover-list" style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <HeartHandshake size={22} style={{ color: "var(--rv-emerald)" }} />
        <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 750 }}>
          Handover & Return Protocol
        </h2>
      </div>

      <ErrorBox message={error} />

      {data.handovers.map((h) => {
        const reportItem = data.reports.find((r) => r.id === h.reportId);
        const title = reportItem?.title || "Recovered item";
        const isCompleted = Boolean(h.returnedAt);
        const bothConfirmed = h.ownerConfirmed && h.finderConfirmed;

        return (
          <article
            key={h.reportId}
            style={{
              background: "var(--rv-panel)",
              border: isCompleted
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : "1px solid var(--rv-line)",
              borderRadius: 16,
              padding: 24,
              marginBottom: 18,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 750,
                    letterSpacing: "0.08em",
                    color: "var(--rv-ghost)",
                    textTransform: "uppercase",
                  }}
                >
                  HANDOVER DESK
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "1.2rem", fontWeight: 750 }}>
                  {title}
                </h3>
              </div>

              {isCompleted ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 9999,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--rv-emerald)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={16} /> Reunited & Returned
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 9999,
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "var(--rv-amber)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <MapPin size={14} /> Safe Handover Arranged
                </span>
              )}
            </div>

            {/* Meetup Spot */}
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.92rem", color: "var(--rv-text)", marginBottom: 18 }}>
              <MapPin size={16} style={{ color: "var(--rv-blue)" }} />
              <strong>Collection Point:</strong> {h.point}
            </p>

            {/* Dual Confirmation Progress Track */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                padding: "14px 16px",
                background: "var(--rv-soft)",
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: h.ownerConfirmed ? "var(--rv-emerald)" : "var(--rv-input)",
                    color: h.ownerConfirmed ? "#fff" : "var(--rv-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {h.ownerConfirmed ? "✓" : "○"}
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--rv-text)" }}>
                    Owner Confirmation
                  </span>
                  <small style={{ color: "var(--rv-muted)" }}>
                    {h.ownerConfirmed ? "Received item" : "Pending collection"}
                  </small>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: h.finderConfirmed ? "var(--rv-emerald)" : "var(--rv-input)",
                    color: h.finderConfirmed ? "#fff" : "var(--rv-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {h.finderConfirmed ? "✓" : "○"}
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--rv-text)" }}>
                    Finder / Staff Confirmation
                  </span>
                  <small style={{ color: "var(--rv-muted)" }}>
                    {h.finderConfirmed ? "Handed over safely" : "Pending transfer"}
                  </small>
                </div>
              </div>
            </div>

            {/* In-Progress Actions */}
            {!isCompleted && (
              <div>
                <p style={{ fontSize: "0.86rem", color: "var(--rv-muted)", marginBottom: 14 }}>
                  Meet at the reception desk. Click your confirmation button only after physical item verification.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {h.isOwner && !h.ownerConfirmed && (
                    <button
                      className="kh-primary-glow-btn"
                      disabled={busy}
                      onClick={() =>
                        void action({ action: "confirm_owner", reportId: h.reportId })
                      }
                    >
                      <Check size={16} /> I received my item
                    </button>
                  )}
                  {h.isFinder && !h.finderConfirmed && (
                    <button
                      className="kh-primary-glow-btn"
                      disabled={busy}
                      onClick={() =>
                        void action({ action: "confirm_finder", reportId: h.reportId })
                      }
                    >
                      <Check size={16} /> I handed over the item
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Finder Receipt Link */}
            {h.isFinder && (
              <div style={{ marginTop: 14 }}>
                <Link
                  href={`/finder/cases/${h.reportId}`}
                  className="rv-text-button"
                  style={{ fontSize: "0.85rem", color: "var(--rv-blue)" }}
                >
                  Open finder receipt & thank-you status →
                </Link>
              </div>
            )}

            {/* Full Emotional Success State when returned */}
            {isCompleted && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.06)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: 12,
                  padding: 22,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <SuccessCheckmark size={48} />
                </div>
                <h4 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 750, color: "var(--rv-text)" }}>
                  Item returned.
                </h4>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--rv-muted)" }}>
                  One less lost thing in the world.
                </p>

                {/* Optional ₹20 Thank-You Flow for Owner */}
                {h.isOwner && (
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 18,
                      borderTop: "1px solid rgba(16, 185, 129, 0.2)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Sparkles size={16} style={{ color: "var(--rv-emerald)" }} />
                      <strong style={{ fontSize: "0.95rem" }}>
                        Want to thank your finder?
                      </strong>
                    </div>
                    <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "var(--rv-muted)" }}>
                      A ₹20 coffee token is entirely optional. The item recovery is already complete.
                    </p>

                    {h.rewardStatus === "skipped" ? (
                      <small style={{ color: "var(--rv-ghost)" }}>Thank-you skipped.</small>
                    ) : h.rewardStatus === "sent_unverified" ? (
                      <small style={{ color: "var(--rv-emerald)", fontWeight: 650 }}>
                        ✓ Marked as sent. Thank you for your kindness!
                      </small>
                    ) : (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        {h.finderUpi ? (
                          <>
                            <a
                              className="kh-primary-glow-btn"
                              style={{ padding: "10px 18px", fontSize: "0.88rem" }}
                              href={`upi://pay?pa=${encodeURIComponent(h.finderUpi)}&am=20&cu=INR&tn=${encodeURIComponent("Optional KHOJ thank-you token")}`}
                            >
                              <Smartphone size={16} /> Open UPI App • ₹20
                            </a>
                            <button
                              type="button"
                              className="rv-button"
                              disabled={busy}
                              style={{ fontSize: "0.85rem" }}
                              onClick={() =>
                                void action({
                                  action: "reward",
                                  reportId: h.reportId,
                                  status: "sent_unverified",
                                })
                              }
                            >
                              I sent the thank-you
                            </button>
                          </>
                        ) : (
                          <small style={{ color: "var(--rv-muted)" }}>
                            The finder hasn’t added a payment ID.
                          </small>
                        )}
                        <button
                          type="button"
                          className="rv-text-button"
                          disabled={busy}
                          onClick={() =>
                            void action({
                              action: "reward",
                              reportId: h.reportId,
                              status: "skipped",
                            })
                          }
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

export function StaffIdCheck({ reportId }: { reportId: string }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <details className="kh-id-check" style={{ marginBottom: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>
        Optional College ID Check before Handover
      </summary>
      <div style={{ marginTop: 12 }}>
        <QrInput value={value} onChange={setValue} />
        <button
          type="button"
          className="kh-primary-glow-btn"
          style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
          disabled={busy || !value}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await featureApi("identity", {
                action: "check_handover",
                reportId,
                payload: value,
              });
              setMessage(r.message);
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Verify Intended Recipient ID
        </button>
        {message && <p role="status" style={{ marginTop: 8, fontSize: "0.85rem" }}>{message}</p>}
      </div>
    </details>
  );
}

/**
 * Blind Verification Challenge Component
 * Prompts owner for their pre-registered distinctive secret detail.
 */
export function BlindVerification({ reportId }: { reportId: string }) {
  const { data, refresh, toast } = usePortal();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  const candidates = data.registeredItems.filter(
    (i) =>
      i.status === "lost" &&
      data.matches.some((m) => m.foundId === reportId && m.lostId === i.lostReportId)
  );

  if (!candidates.length) return null;

  return (
    <div
      style={{
        background: "var(--rv-panel)",
        border: "1px solid var(--rv-blue)",
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
        boxShadow: "0 8px 24px rgba(99, 102, 241, 0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Lock size={18} style={{ color: "var(--rv-blue)" }} />
        <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 750 }}>
          Potential match found. Prove ownership.
        </h4>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: "0.86rem", color: "var(--rv-muted)", lineHeight: 1.45 }}>
        Before details are shared, confirm the private mark or secret you registered before this item went missing.
      </p>

      {verified ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--rv-emerald)" }}>
          <CheckCircle2 size={20} />
          <strong>Ownership verified. Safe collection arranged below.</strong>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await featureApi("items", {
                action: "blind_verify",
                reportId,
                ...Object.fromEntries(new FormData(e.currentTarget)),
              });
              await refresh();
              setVerified(true);
              toast("Ownership verified! Arrange safe collection from My Reports.");
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="rv-field" style={{ marginBottom: 12 }}>
            REGISTERED ITEM
            <select name="lostId" required>
              {candidates.map((i) => (
                <option key={i.id} value={i.lostReportId!}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>

          <label className="rv-field" style={{ marginBottom: 14 }}>
            YOUR SECRET DETAIL
            <textarea
              name="answer"
              minLength={6}
              maxLength={1000}
              required
              rows={2}
              placeholder="e.g. Scratch on left hinge or sticker under case"
            />
          </label>

          <ErrorBox message={error} />

          <button
            className="kh-primary-glow-btn"
            disabled={busy}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {busy ? "Verifying secret detail…" : "Verify Ownership"}
          </button>
        </form>
      )}
    </div>
  );
}
