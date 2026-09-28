"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Modal } from "./ui";
import { categories, locations } from "@/lib/model";
type LiveItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  status: string;
  photo?: string;
};
type Match = {
  id: string;
  item_id: string;
  status: string;
  score: number | null;
};
type Recovery = {
  id: string;
  match_id: string;
  status: string;
  owner_confirmed: boolean;
  finder_confirmed: boolean;
  location?: string;
};
type Reward = {
  id: string;
  recovery_id: string;
  status: string;
  finder_upi?: string;
};
type Found = { id: string; category: string; rough_location: string };
type Review = {
  match_id: string;
  item_name: string;
  registered_detail: string;
  owner_answer: string;
  found_location: string;
  photo?: string;
};
type State = {
  matches: Match[];
  recoveries: Recovery[];
  rewards: Reward[];
  board: Found[];
};
type ActionDialog =
  | { type: "register" }
  | { type: "lost"; item: LiveItem }
  | { type: "claim"; report: Found }
  | { type: "verify"; match: Match }
  | { type: "reward"; recovery: Recovery };
async function api(url: string, body?: unknown) {
  const r = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers:
            body instanceof FormData
              ? undefined
              : { "Content-Type": "application/json" },
          body: body instanceof FormData ? body : JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401) window.location.assign("/login");
    throw new Error(data.error || "The request could not be completed.");
  }
  return data;
}
export default function LiveWorkspace({ email }: { email: string }) {
  const [items, setItems] = useState<LiveItem[]>([]),
    [state, setState] = useState<State>({
      matches: [],
      recoveries: [],
      rewards: [],
      board: [],
    }),
    [reviews, setReviews] = useState<Review[]>([]),
    [section, setSection] = useState("items"),
    [dialog, setDialog] = useState<ActionDialog | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api("/api/owner/items"),
        api("/api/owner/state"),
      ]);
      setItems(a.items);
      setState(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(body: unknown) {
    setBusy(true);
    setError("");
    try {
      await api("/api/owner/actions", body);
      setDialog(null);
      setMessage("Saved. Your case is up to date.");
      await load();
      if (section === "review")
        setReviews((await api("/api/owner/review")).queue);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dialog) return;
    const f = new FormData(e.currentTarget);
    if (dialog.type === "register") {
      setBusy(true);
      setError("");
      try {
        await api("/api/owner/items", f);
        setDialog(null);
        setMessage("Your item is saved.");
        await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (dialog.type === "lost")
      return action({
        action: "mark_lost",
        itemId: dialog.item.id,
        location: f.get("location") || undefined,
      });
    if (dialog.type === "claim")
      return action({
        action: "claim",
        reportId: dialog.report.id,
        itemId: f.get("itemId"),
        answer: f.get("answer"),
      });
    if (dialog.type === "verify")
      return action({
        action: "verify",
        matchId: dialog.match.id,
        answer: f.get("answer"),
      });
    if (dialog.type === "reward")
      return action({
        action: "reward",
        recoveryId: dialog.recovery.id,
        skip: false,
        upi: f.get("upi"),
      });
  }
  return (
    <>
      <div className="workspace-toolbar">
        <div
          className="workspace-tabs"
          role="tablist"
          aria-label="Your campus items"
        >
          {["items", "board", "recoveries", "review"].map((s) => (
            <button
              role="tab"
              aria-selected={section === s}
              className={section === s ? "selected" : ""}
              key={s}
              onClick={async () => {
                setSection(s);
                setError("");
                if (s === "review") {
                  try {
                    setReviews((await api("/api/owner/review")).queue);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }
              }}
            >
              {s === "items"
                ? "My items"
                : s === "board"
                  ? "Unclaimed"
                  : s === "review"
                    ? "Staff review"
                    : "Item returns"}
            </button>
          ))}
        </div>
        <button
          className="text-button"
          onClick={async () => {
            try {
              await api("/auth/signout", {});
              window.location.assign("/login");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Sign out
        </button>
      </div>
      <p className="small muted">Signed in as {email}</p>
      {error && !dialog && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="positive" role="status">
          {message}
        </p>
      )}
      {loading ? (
        <div className="skeleton" aria-label="Loading your campus belongings" />
      ) : (
        <>
          {section === "items" && (
            <>
              <div className="section-heading">
                <h2>Your belongings</h2>
                <button
                  className="outline"
                  onClick={() => {
                    setError("");
                    setDialog({ type: "register" });
                  }}
                >
                  <Plus size={18} /> Add an item
                </button>
              </div>
              {state.matches
                .filter((m) => m.status === "POTENTIAL_MATCH")
                .map((m) => (
                  <section className="live-match" key={m.id}>
                    <div>
                      <h3>Something familiar turned up.</h3>
                      <p className="muted">
                        A possible match for{" "}
                        {items.find((i) => i.id === m.item_id)?.name}. Ownership
                        still needs to be checked.
                      </p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => setDialog({ type: "verify", match: m })}
                    >
                      Review match <ArrowRight size={16} />
                    </button>
                  </section>
                ))}
              <div className="item-grid">
                {items.map((i) => (
                  <article className="item-card" key={i.id}>
                    {i.photo ? (
                      <img className="product-art" src={i.photo} alt={i.name} />
                    ) : (
                      <div className="product-art no-photo">
                        <ShieldCheck />
                        Photo unavailable
                      </div>
                    )}
                    <div className="item-info">
                      <h3>{i.name}</h3>
                      <p>
                        {i.category} · {i.brand || "Personal belonging"}
                      </p>
                      <span className={`status ${i.status.toLowerCase()}`}>
                        {i.status}
                      </span>
                      {i.status === "SAFE" && (
                        <button
                          className="card-button"
                          onClick={() => setDialog({ type: "lost", item: i })}
                        >
                          Mark as lost <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {!items.length && (
                <div className="empty">
                  <ShoppingPrompt />
                </div>
              )}
            </>
          )}
          {section === "board" && (
            <>
              <p className="muted">
                Only broad locations are shown. Describe the item before meeting
                details can be shared.
              </p>
              <div className="board-grid">
                {state.board.map((r) => (
                  <article className="board-card" key={r.id}>
                    <div className="restricted-image">
                      <ShieldCheck size={38} />
                      <span>Identifying photo kept private</span>
                    </div>
                    <div className="item-info">
                      <h3>
                        {r.category === "Other"
                          ? "Found belonging"
                          : r.category}
                      </h3>
                      <p>{r.rough_location}</p>
                      <button
                        className="card-button"
                        onClick={() => setDialog({ type: "claim", report: r })}
                      >
                        This might be mine <ArrowRight size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!state.board.length && (
                <div className="empty">
                  <h2>Nothing unclaimed right now.</h2>
                  <p>New reports will appear here when they need an owner.</p>
                </div>
              )}
            </>
          )}
          {section === "recoveries" && (
            <div className="recovery-list">
              {state.recoveries.map((r) => {
                const reward = state.rewards.find(
                    (w) => w.recovery_id === r.id,
                  ),
                  match = state.matches.find((m) => m.id === r.match_id);
                return (
                  <section
                    className={`recovery form-panel ${r.status === "RETURNED" ? "celebration" : ""}`}
                    key={r.id}
                  >
                    <div className="success-mark">
                      <Check />
                    </div>
                    <h2>
                      {r.status === "RETURNED"
                        ? "Reunited. And it feels good."
                        : "Ready to return."}
                    </h2>
                    <p className="muted">
                      {items.find((i) => i.id === match?.item_id)?.name}
                    </p>
                    {r.status !== "RETURNED" ? (
                      <>
                        <div className="handover-location">
                          <span>Meeting place</span>
                          <strong>{r.location}</strong>
                          <small>
                            Meet in a public place on campus where staff are
                            nearby.
                          </small>
                        </div>
                        <button
                          className={
                            r.owner_confirmed ? "confirmed" : "primary"
                          }
                          disabled={busy || r.owner_confirmed}
                          onClick={() =>
                            action({
                              action: "confirm_return",
                              recoveryId: r.id,
                            })
                          }
                        >
                          {r.owner_confirmed
                            ? "You received the item"
                            : "I received my item"}
                        </button>
                        <p className="small muted">
                          {r.finder_confirmed
                            ? "The finder has confirmed the return."
                            : "The finder must also confirm through their private link."}
                        </p>
                      </>
                    ) : (
                      <>
                        {reward?.status === "NOT_OFFERED" ? (
                          <>
                            <p>
                              Your item is home. A thank-you is entirely
                              optional.
                            </p>
                            <button
                              className="primary"
                              onClick={() =>
                                setDialog({ type: "reward", recovery: r })
                              }
                            >
                              Thank your finder · ₹20
                            </button>
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                action({
                                  action: "reward",
                                  recoveryId: r.id,
                                  skip: true,
                                })
                              }
                            >
                              Skip for now
                            </button>
                          </>
                        ) : reward?.status === "PENDING" ? (
                          <>
                            <a
                              className="primary"
                              href={`upi://pay?pa=${encodeURIComponent(reward.finder_upi || "")}&pn=Finder&am=20&cu=INR&tn=KHOJ%20thank%20you`}
                            >
                              Open UPI app · ₹20
                            </a>
                            <p className="small muted">
                              Pay directly to {reward.finder_upi}. The finder
                              confirms receipt; KHOJ does not process or verify
                              the payment.
                            </p>
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                action({
                                  action: "reward",
                                  recoveryId: r.id,
                                  skip: true,
                                })
                              }
                            >
                              Skip thank-you
                            </button>
                          </>
                        ) : (
                          <p className="positive">
                            {reward?.status === "PAID"
                              ? "Finder confirmed the thank-you."
                              : "All done. Your item is back with you."}
                          </p>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
              {!state.recoveries.length && (
                <div className="empty">
                  <h2>First, let’s be sure.</h2>
                  <p>
                    Approved claims appear here. Your ownership description must
                    be checked before the item is returned.
                  </p>
                </div>
              )}
            </div>
          )}
          {section === "review" && (
            <div className="review-list">
              {reviews.map((r) => (
                <section className="review-card" key={r.match_id}>
                  <h2>{r.item_name}</h2>
                  <dl>
                    <dt>Saved item detail</dt>
                    <dd>{r.registered_detail}</dd>
                    <dt>Owner description</dt>
                    <dd>{r.owner_answer}</dd>
                    <dt>Found location</dt>
                    <dd>{r.found_location}</dd>
                  </dl>
                  {r.photo && (
                    <img
                      className="review-photo"
                      src={r.photo}
                      alt="Private photo of the found item"
                    />
                  )}
                  <div className="confirmation-row">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        action({
                          action: "review",
                          matchId: r.match_id,
                          approve: true,
                        })
                      }
                    >
                      Approve ownership
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        action({
                          action: "review",
                          matchId: r.match_id,
                          approve: false,
                        })
                      }
                    >
                      Reject claim
                    </button>
                  </div>
                </section>
              ))}
              {!reviews.length && !error && (
                <div className="empty">
                  <h2>No claims waiting for review.</h2>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {dialog && (
        <Modal
          title={
            dialog.type === "register"
              ? "Make it yours."
              : dialog.type === "lost"
                ? "Let’s help it get back."
                : dialog.type === "reward"
                  ? "A little thank-you."
                  : "What makes it yours?"
          }
          onClose={() => {
            if (!busy) {
              setDialog(null);
              setError("");
            }
          }}
        >
          <form className="form" onSubmit={submit}>
            {dialog.type === "register" ? (
              <>
                <label>
                  Item name
                  <input name="name" required maxLength={80} />
                </label>
                <div className="form-row">
                  <label>
                    Category
                    <select name="category">
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Brand · optional
                    <input name="brand" maxLength={80} />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Model · optional
                    <input name="model" maxLength={80} />
                  </label>
                  <label>
                    Colour · optional
                    <input name="colour" maxLength={50} />
                  </label>
                </div>
                <label>
                  Two or three photos
                  <input
                    type="file"
                    name="photos"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    required
                  />
                </label>
                <p className="small muted">
                  Up to 3 MB each. Your photos are kept private.
                </p>
                <label>
                  A detail only you would know
                  <textarea
                    name="detail"
                    required
                    minLength={8}
                    maxLength={500}
                  />
                </label>
              </>
            ) : dialog.type === "lost" ? (
              <label>
                Last seen · optional
                <select name="location" defaultValue="">
                  <option value="">Not sure</option>
                  {locations.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            ) : dialog.type === "reward" ? (
              <>
                <p className="muted">
                  Ask the finder for their UPI ID. Payment goes directly through
                  your UPI app.
                </p>
                <label>
                  Finder UPI ID
                  <input
                    name="upi"
                    required
                    pattern="[a-zA-Z0-9._-]+@[a-zA-Z0-9]+"
                    maxLength={100}
                  />
                </label>
              </>
            ) : (
              <>
                <p className="muted">
                  Describe a mark, engraving, damage or accessory only the owner
                  would know. A campus helper checks these details before the
                  item is returned.
                </p>
                {dialog.type === "claim" && (
                  <label>
                    Your lost item
                    <select name="itemId" defaultValue="" required>
                      <option value="" disabled>
                        Select a lost item
                      </option>
                      {items
                        .filter((i) => i.status === "LOST")
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label>
                  Your private item detail
                  <textarea
                    name="answer"
                    required
                    minLength={8}
                    maxLength={500}
                  />
                </label>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Saving…"
                : dialog.type === "register"
                  ? "Save item"
                  : dialog.type === "lost"
                    ? "Mark as lost"
                    : dialog.type === "reward"
                      ? "Prepare thank-you"
                      : "Send for checking"}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function ShoppingPrompt() {
  return (
    <>
      <ShieldCheck size={35} />
      <h2>Start with something important.</h2>
      <p>Add your belongings with a few photos and a detail only you know.</p>
    </>
  );
}
