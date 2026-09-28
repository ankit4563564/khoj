"use client";
import { useState } from "react";
import { Check, ShieldCheck, ArrowRight, Heart, Clock } from "lucide-react";
import { canOfferReward, type RecoveryCase, type Store } from "@/lib/model";
export function Recovery({
  data,
  onConfirm,
  onReward,
}: {
  data: Store;
  onConfirm: (id: string, role: "owner" | "finder") => void;
  onReward: (id: string, status: RecoveryCase["reward"], upi?: string) => void;
}) {
  const [payFor, setPayFor] = useState("");
  const cases = data.cases.filter((c) =>
    ["HANDOVER", "RETURNED"].includes(c.status),
  );
  if (!cases.length)
    return (
      <div className="empty">
        <ShieldCheck size={40} />
        <h2>First, let’s be sure.</h2>
        <p>
          Verified matches will appear here with the next steps for a safe
          handover.
        </p>
        <a className="secondary" href="/">
          Back to overview <ArrowRight size={16} />
        </a>
      </div>
    );
  return (
    <div className="recovery-list">
      {cases.map((c) => {
        const returned = canOfferReward(c),
          item = data.items.find((i) => i.id === c.itemId);
        return (
          <section
            className={`form-panel recovery ${returned ? "celebration" : ""}`}
            key={c.id}
          >
            <div className="success-mark">
              {returned ? <Check /> : <ShieldCheck />}
            </div>
            <p className="eyebrow">
              {returned ? "BACK WHERE IT BELONGS" : "OWNERSHIP VERIFIED"}
            </p>
            <h2>
              {returned ? "Reunited. And it feels good." : "One handover away."}
            </h2>
            <p className="muted">
              {item?.name} · {c.id}
            </p>
            {!returned ? (
              <>
                <div className="handover-location">
                  <span>Suggested meeting point</span>
                  <strong>{c.location}</strong>
                  <small>
                    Arrange a handover at a staffed public campus location.
                  </small>
                </div>
                <p className="notice">
                  Demo controls below simulate the two participants. Live
                  accounts and private finder links are not connected.
                </p>
                <div className="confirmation-row">
                  <button
                    className={c.ownerConfirmed ? "confirmed" : "primary"}
                    disabled={c.ownerConfirmed}
                    onClick={() => onConfirm(c.id, "owner")}
                  >
                    {c.ownerConfirmed ? <Check size={17} /> : null}
                    {c.ownerConfirmed
                      ? "Owner confirmed"
                      : "I received my item"}
                  </button>
                  <button
                    className={c.finderConfirmed ? "confirmed" : "secondary"}
                    disabled={c.finderConfirmed}
                    onClick={() => onConfirm(c.id, "finder")}
                  >
                    {c.finderConfirmed ? <Check size={17} /> : null}
                    {c.finderConfirmed
                      ? "Finder confirmed"
                      : "I returned the item"}
                  </button>
                </div>
                <p className="small muted">
                  <Clock size={14} /> Both confirmations are needed to complete
                  the return.
                </p>
              </>
            ) : (
              <>
                <p>
                  Someone went a little out of their way.
                  <br />A thank-you can go a long way, too.
                </p>
                {c.reward === "NOT_OFFERED" ? (
                  <>
                    <div className="reward-amount">₹20</div>
                    <p className="small muted">
                      Completely optional. Your recovery is already complete.
                    </p>
                    {payFor === c.id ? (
                      <form
                        className="form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          onReward(c.id, "PENDING", String(f.get("upi")));
                        }}
                      >
                        <label>
                          Finder UPI ID
                          <input
                            name="upi"
                            placeholder="finder@upi"
                            pattern="[a-zA-Z0-9._-]+@[a-zA-Z0-9]+"
                            required
                          />
                        </label>
                        <button className="primary">
                          Prepare ₹20 thank-you <ArrowRight size={17} />
                        </button>
                      </form>
                    ) : (
                      <button
                        className="primary"
                        onClick={() => setPayFor(c.id)}
                      >
                        <Heart size={17} /> Thank your finder
                      </button>
                    )}
                    <button
                      className="text-button"
                      onClick={() => onReward(c.id, "SKIPPED")}
                    >
                      Skip for now
                    </button>
                  </>
                ) : c.reward === "PENDING" ? (
                  <div className="form">
                    <a
                      className="primary"
                      href={`upi://pay?pa=${encodeURIComponent(c.upi || "")}&pn=Finder&am=20&cu=INR&tn=KHOJ%20thank%20you`}
                    >
                      Open UPI app · ₹20 <ArrowRight size={16} />
                    </a>
                    <p className="small muted">
                      Pay directly to {c.upi}. KHOJ does not process or verify
                      payments.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => onReward(c.id, "PAID")}
                    >
                      Demo: finder confirms payment received
                    </button>
                    <button
                      className="text-button"
                      onClick={() => onReward(c.id, "SKIPPED")}
                    >
                      Skip thank-you
                    </button>
                  </div>
                ) : (
                  <p className="positive">
                    {c.reward === "PAID"
                      ? "Finder marked the thank-you received."
                      : "All done. Kindness doesn’t need a price tag."}
                  </p>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
