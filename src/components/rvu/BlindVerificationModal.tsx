"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, ShieldCheck, Lock, ArrowRight, RefreshCw } from "lucide-react";
import { MotionModal } from "./MotionPrimitives";
import { ErrorBox } from "./Common";
import { usePortal } from "./PortalProvider";
import type { ClientChallengeView, ClientVerificationResponse } from "@/lib/rvu/verification/verificationTypes";

interface BlindVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateMatchId: string;
  onVerifiedSuccess?: () => void;
}

export function BlindVerificationModal({
  isOpen,
  onClose,
  candidateMatchId,
  onVerifiedSuccess,
}: BlindVerificationModalProps) {
  const { toast } = usePortal();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<ClientChallengeView | null>(null);
  const [answer, setAnswer] = useState("");
  const [response, setResponse] = useState<ClientVerificationResponse | null>(null);

  // Initialize or fetch challenge when modal opens
  useEffect(() => {
    if (isOpen && candidateMatchId) {
      initSession();
    } else {
      setChallenge(null);
      setAnswer("");
      setError("");
      setResponse(null);
    }
  }, [isOpen, candidateMatchId]);

  async function initSession() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rvu/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", candidateMatchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to initiate verification session.");
      }
      setChallenge(data.challenge);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || !answer.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/rvu/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          sessionId: challenge.sessionId,
          answer: answer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification submission failed.");
      }

      const result: ClientVerificationResponse = data.result;
      setResponse(result);

      if (result.verified) {
        toast("Ownership verified! Safe recovery pending.");
        if (onVerifiedSuccess) onVerifiedSuccess();
      } else if (result.state === "REQUIRES_MANUAL_REVIEW") {
        toast("Claim submitted for manual campus staff review.");
      } else if (result.state === "PENDING_CHALLENGE") {
        toast(result.message || "Could not verify. You may try again.");
        // Refresh challenge for follow-up or retry
        await initSession();
        setAnswer("");
      } else {
        toast(result.message || "Verification attempt failed.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MotionModal isOpen={isOpen} onClose={onClose} title="Blind Ownership Verification">
      <div style={{ padding: "8px 0" }}>
        {/* Header Privacy Notice */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <ShieldCheck size={20} color="var(--rv-emerald, #10b981)" />
          <span style={{ fontSize: "0.85rem", color: "var(--rv-text, #333)" }}>
            <strong>Potential match found.</strong> Before found details are revealed, prove private knowledge of your
            registered item.
          </span>
        </div>

        <ErrorBox message={error} />

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--rv-muted)" }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 10px" }} />
            <p style={{ fontSize: "0.9rem" }}>Preparing private ownership challenge...</p>
          </div>
        ) : response?.verified ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2 size={48} color="var(--rv-emerald, #10b981)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>Ownership Verified</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--rv-muted)", maxWidth: 380, margin: "0 auto 20px" }}>
              Your private knowledge matches the registered belonging. Next step: scheduled custody recovery.
            </p>
            <button className="kh-primary-glow-btn" onClick={onClose} style={{ margin: "0 auto" }}>
              Done
            </button>
          </div>
        ) : response?.state === "REQUIRES_MANUAL_REVIEW" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <AlertCircle size={48} color="var(--rv-amber, #f59e0b)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>Queued for Staff Review</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--rv-muted)", maxWidth: 380, margin: "0 auto 20px" }}>
              General item details recorded. Because distinctive marks were ambiguous or generic, a campus staff member
              will verify your claim manually.
            </p>
            <button className="kh-primary-glow-btn" onClick={onClose} style={{ margin: "0 auto" }}>
              Close
            </button>
          </div>
        ) : challenge ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  color: "var(--rv-muted)",
                  marginBottom: 8,
                }}
              >
                <span>CHALLENGE {challenge.challengeIndex} OF {challenge.totalChallenges}</span>
                <span>ATTEMPT {challenge.attemptNumber} OF {challenge.maxAttempts}</span>
              </div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                {challenge.question}
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                required
                minLength={3}
                maxLength={1000}
                placeholder="Describe your item's private identifying feature in your own words..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--rv-border, #ccc)",
                  background: "var(--rv-surface, #fff)",
                  color: "var(--rv-text, #000)",
                  fontSize: "0.9rem",
                  resize: "vertical",
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--rv-muted)", marginTop: 4, display: "block" }}>
                Answers are evaluated against your pre-registered item vault. Never share passwords or PINs.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid var(--rv-border, #ccc)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !answer.trim()}
                className="kh-primary-glow-btn"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Checking...
                  </>
                ) : (
                  <>
                    Submit Answer
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </MotionModal>
  );
}
