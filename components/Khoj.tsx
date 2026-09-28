"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Search,
  House,
  ShoppingBag,
  PanelsTopLeft,
  Plus,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  FlaskConical,
  Menu,
  X,
  Check,
  ClipboardCheck,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useStore } from "@/lib/use-store";
import {
  seed,
  id,
  confirmReturn,
  canOfferReward,
  type Item,
  type RecoveryCase,
  categories,
} from "@/lib/model";
import { Modal, ProductArt } from "./ui";
import { RegisterForm, FoundForm, LostForm } from "./forms";
import { Recovery } from "./recovery";
type Dialog =
  | { type: "register" }
  | { type: "item" | "lost"; item: Item }
  | { type: "verify"; case: RecoveryCase };
const nav = [
  { href: "/", view: "overview", label: "Overview", icon: House },
  { href: "/items", view: "items", label: "My items", icon: ShoppingBag },
  {
    href: "/board",
    view: "board",
    label: "Unclaimed board",
    icon: PanelsTopLeft,
  },
  { href: "/found", view: "found", label: "Report a find", icon: Plus },
];
export default function Khoj({ view }: { view: string }) {
  const { data, setData, ready, storageError } = useStore(),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [mobile, setMobile] = useState(false),
    [filter, setFilter] = useState("All"),
    [query, setQuery] = useState(""),
    [toast, setToast] = useState(""),
    [resetRequested, setResetRequested] = useState(false);
  function notify(s: string) {
    setToast(s);
  }
  const pending = data.cases.find((c) => c.status === "POTENTIAL_MATCH"),
    pendingItem = data.items.find((i) => i.id === pending?.itemId);
  const submitted = data.cases.some((c) => c.status === "MANUAL_REVIEW");
  const activeRecovery = data.cases.some((c) =>
    ["HANDOVER", "RETURNED"].includes(c.status),
  );
  function updateCase(cid: string, patch: Partial<RecoveryCase>) {
    setData((d) => ({
      ...d,
      cases: d.cases.map((c) => (c.id === cid ? { ...c, ...patch } : c)),
    }));
  }
  function verify(c: RecoveryCase, answer: string, itemId: string) {
    setData((d) => ({
      ...d,
      cases: d.cases.map((x) =>
        x.id === c.id
          ? {
              ...x,
              itemId,
              status: "MANUAL_REVIEW",
              source: x.status === "UNCLAIMED" ? "manual_claim" : x.source,
            }
          : x,
      ),
      attempts: [
        ...d.attempts,
        {
          id: id("ATT"),
          caseId: c.id,
          itemId,
          answer,
          result: "pending",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setDialog(null);
    notify("Ownership details submitted for review.");
  }
  function review(cid: string, approved: boolean) {
    setData((d) => ({
      ...d,
      cases: d.cases.map((c) =>
        c.id === cid
          ? {
              ...c,
              status: approved ? "HANDOVER" : "UNCLAIMED",
              itemId: approved ? c.itemId : undefined,
            }
          : c,
      ),
      attempts: d.attempts.map((a) =>
        a.caseId === cid && a.result === "pending"
          ? { ...a, result: approved ? "matched" : "rejected" }
          : a,
      ),
    }));
    notify(
      approved
        ? "Practice claim approved. The item is ready to return."
        : "Claim rejected. The report is unclaimed again.",
    );
  }
  function confirm(cid: string, role: "owner" | "finder") {
    setData((d) => {
      const cases = d.cases.map((c) =>
        c.id === cid ? confirmReturn(c, role) : c,
      );
      const c = cases.find((c) => c.id === cid);
      return {
        ...d,
        cases,
        items: d.items.map((i) =>
          i.id === c?.itemId && c.status === "RETURNED"
            ? { ...i, status: "RETURNED" }
            : i,
        ),
      };
    });
  }
  function reward(cid: string, status: RecoveryCase["reward"], upi?: string) {
    const c = data.cases.find((c) => c.id === cid);
    if (c && canOfferReward(c))
      updateCase(cid, { reward: status, ...(upi ? { upi } : {}) });
  }
  const titles: Record<string, [string, string]> = {
    overview: [
      "A little lost. Not gone.",
      "Your belongings. Your campus. A way back.",
    ],
    items: [
      "Keep your world close.",
      "Add it once. We’ll help it find its way back.",
    ],
    board: [
      "Still looking for home.",
      "Recognise something? Tell us what makes it yours.",
    ],
    found: [
      "Found something?",
      "One photo. One small act. A way back to its owner.",
    ],
    recovery: [
      "A way back, together.",
      "The last few steps are the ones that matter.",
    ],
    review: [
      "A thoughtful second look.",
      "Try checking a claim using example items.",
    ],
  };
  return (
    <div className="app-shell">
      <button
        className="mobile-menu icon-button"
        aria-label="Toggle navigation"
        onClick={() => setMobile(!mobile)}
      >
        {mobile ? <X /> : <Menu />}
      </button>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Search />
          </span>
          <div>
            <strong>KHOJ</strong>
            <span>Campus lost & found</span>
          </div>
        </Link>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.view}
              href={n.href}
              className={view === n.view ? "nav-link active" : "nav-link"}
              onClick={() => setMobile(false)}
              aria-current={view === n.view ? "page" : undefined}
            >
              <n.icon size={21} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/recovery"
            className={`nav-link utility ${view === "recovery" ? "active" : ""}`}
          >
            <RotateCcw size={18} /> Recoveries
            {activeRecovery && <span className="dot" />}
          </Link>
          <Link
            href="/review"
            className={`nav-link utility ${view === "review" ? "active" : ""}`}
          >
            <ClipboardCheck size={18} /> Practice checks
          </Link>
          <div className="demo-note">
            <FlaskConical size={21} />
            <div>
              Practice version
              <small>Example items. Saved only in this browser.</small>
            </div>
          </div>
          <Link className="college-link" href="/login">
            <ShieldCheck size={16} /> RV University sign-in{" "}
            <ArrowRight size={14} />
          </Link>
          <div className="profile">
            <span className="avatar">A</span>
            <span>
              A Student<small>Your practice account</small>
            </span>
          </div>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <span className="mobile-brand">KHOJ</span>
          {view !== "found" && (
            <Link className="outline" href="/found">
              <Plus size={18} /> Found something?
            </Link>
          )}
        </div>
        <header className="page-heading">
          <h1>{titles[view][0]}</h1>
          <p>{titles[view][1]}</p>
        </header>
        {storageError && (
          <p className="notice" role="alert">
            {storageError}
          </p>
        )}
        {!ready ? (
          <div className="skeleton" aria-label="Loading saved belongings" />
        ) : (
          <div className="page-content" key={view}>
            {(view === "overview" || view === "items") && (
              <>
                {view === "overview" &&
                  (pending ? (
                    <section className="match-panel">
                      <div className="match-copy">
                        <span className="eyebrow">POTENTIAL MATCH</span>
                        <h2>Something familiar turned up.</h2>
                        <p>
                          A possible match for your {pendingItem?.name} is ready
                          to review.
                        </p>
                        <button
                          className="primary"
                          onClick={() =>
                            setDialog({ type: "verify", case: pending })
                          }
                        >
                          Review potential match <ChevronRight size={18} />
                        </button>
                      </div>
                      <div className="confidence">
                        <svg viewBox="0 0 120 120" aria-hidden="true">
                          <circle cx="60" cy="60" r="51" />
                          <circle
                            className="progress"
                            cx="60"
                            cy="60"
                            r="51"
                            strokeDasharray={`${(pending.score || 92) * 3.204} 320.4`}
                          />
                        </svg>
                        <strong>{pending.score}%</strong>
                        <span>Visual similarity</span>
                        <small>Sample match · not proof of ownership</small>
                      </div>
                    </section>
                  ) : (
                    <section className="match-panel compact">
                      <div>
                        <span className="eyebrow">
                          {submitted
                            ? "REVIEW IN PROGRESS"
                            : activeRecovery
                              ? "A STEP CLOSER"
                              : "A LITTLE PEACE OF MIND"}
                        </span>
                        <h2>
                          {submitted
                            ? "The details make the difference."
                            : activeRecovery
                              ? "Your way back is ready."
                              : "Your belongings, in good company."}
                        </h2>
                        <p>
                          {submitted
                            ? "Your description is ready for a practice check."
                            : activeRecovery
                              ? "Arrange to get your item back or see a completed return."
                              : "Save your important items here, just in case."}
                        </p>
                        <Link
                          href={submitted ? "/review" : "/recovery"}
                          className="text-link"
                        >
                          {submitted
                            ? "Check practice claims"
                            : "View item returns"}
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                      <ShieldCheck className="feature-icon" />
                    </section>
                  ))}
                <div className="section-heading">
                  <h2>Your belongings</h2>
                  <button
                    className="outline"
                    onClick={() => setDialog({ type: "register" })}
                  >
                    <Plus size={18} /> Add an item
                  </button>
                </div>
                {view === "items" && (
                  <div className="filters">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        aria-label="Search items"
                        placeholder="Search your belongings"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Filter item status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option>All</option>
                      <option>Lost</option>
                      <option>Safe</option>
                      <option>Returned</option>
                    </select>
                  </div>
                )}
                <div className="item-grid">
                  {data.items
                    .filter(
                      (i) =>
                        (filter === "All" ||
                          i.status === filter.toUpperCase()) &&
                        i.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((item) => (
                      <article key={item.id} className="item-card">
                        <ProductArt
                          art={item.art}
                          photo={item.photos[0]}
                          name={item.name}
                        />
                        <div className="item-info">
                          <h3>{item.name}</h3>
                          <p>
                            {item.category}
                            {item.brand && (
                              <>
                                {" "}
                                <span>·</span> {item.brand}
                              </>
                            )}
                          </p>
                          <span
                            className={`status ${item.status.toLowerCase()}`}
                          >
                            <i />
                            {item.status === "LOST"
                              ? "Lost"
                              : item.status === "RETURNED"
                                ? "Returned"
                                : "Safe"}
                          </span>
                          <button
                            className="card-button"
                            onClick={() => setDialog({ type: "item", item })}
                          >
                            View item <ChevronRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
                {!data.items.some(
                  (i) =>
                    (filter === "All" || i.status === filter.toUpperCase()) &&
                    i.name.toLowerCase().includes(query.toLowerCase()),
                ) && (
                  <div className="empty">
                    <Search />
                    <h3>No belongings match.</h3>
                    <button
                      className="text-button"
                      onClick={() => {
                        setFilter("All");
                        setQuery("");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                <div className="privacy-band">
                  <ShieldCheck size={34} />
                  <div>
                    <h3>Your details stay yours.</h3>
                    <p>
                      Identifying details are only shared after ownership is
                      confirmed.
                    </p>
                  </div>
                </div>
              </>
            )}
            {view === "found" && (
              <div className="finder-layout">
                <FoundForm
                  onSave={(c) =>
                    setData((d) => ({ ...d, cases: [...d.cases, c] }))
                  }
                  onPhone={(cid, phone) => updateCase(cid, { phone })}
                />
                <aside className="finder-aside">
                  <ShieldCheck size={28} />
                  <h2>
                    A good deed.
                    <br />
                    Without the extra steps.
                  </h2>
                  <p>
                    No account or sign-in required. Just upload the photo and
                    choose where you found it.
                  </p>
                  <hr />
                  <h3>Return first. Thank-you later.</h3>
                  <p>
                    The owner can choose to send a ₹20 thank-you after the
                    return. It is optional and never guaranteed.
                  </p>
                  <div className="notice">
                    You’re trying the practice version. Reports and photos stay
                    in this browser; they aren’t sent to your campus.
                  </div>
                </aside>
              </div>
            )}
            {view === "board" && (
              <>
                <div className="filters">
                  <span className="muted">
                    <SlidersHorizontal size={17} /> Browse by category
                  </span>
                  <select
                    aria-label="Filter found items"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option>All</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="board-grid">
                  {data.cases
                    .filter(
                      (c) =>
                        c.status === "UNCLAIMED" &&
                        (filter === "All" || c.category === filter),
                    )
                    .map((c) => (
                      <article className="board-card" key={c.id}>
                        <div className="restricted-image">
                          <ShoppingBag size={42} />
                          <span>Identifying photo kept private</span>
                        </div>
                        <div className="item-info">
                          <span className="small muted">{c.id}</span>
                          <h3>
                            {c.category === "Other"
                              ? "Found belonging"
                              : c.category}
                          </h3>
                          <p>
                            On campus ·{" "}
                            {c.location.includes("Library")
                              ? "Library area"
                              : c.location === "Academic block"
                                ? "Academic area"
                                : "Campus area"}
                          </p>
                          <button
                            className="card-button"
                            onClick={() =>
                              setDialog({ type: "verify", case: c })
                            }
                          >
                            This might be mine <ArrowRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
                {!data.cases.some(
                  (c) =>
                    c.status === "UNCLAIMED" &&
                    (filter === "All" || c.category === filter),
                ) && (
                  <div className="empty">
                    <Check />
                    <h2>Nothing unclaimed here.</h2>
                    <p>
                      Try another category or check back after a new report.
                    </p>
                  </div>
                )}
                <p className="small muted board-note">
                  <ShieldCheck size={17} /> Exact locations and private item
                  photos stay hidden during claims.
                </p>
              </>
            )}
            {view === "recovery" && (
              <Recovery data={data} onConfirm={confirm} onReward={reward} />
            )}
            {view === "review" && (
              <>
                <div className="notice">
                  Try checking whether an item belongs to someone. These buttons
                  are for practice only; they do not approve real claims.
                </div>
                <div className="review-list">
                  {data.cases
                    .filter((c) => c.status === "MANUAL_REVIEW")
                    .map((c) => {
                      const a = data.attempts.findLast(
                          (a) => a.caseId === c.id,
                        ),
                        item = data.items.find((i) => i.id === c.itemId);
                      return (
                        <article className="review-card" key={c.id}>
                          <div className="section-heading">
                            <h3>{item?.name}</h3>
                            <span className="status lost">Manual review</span>
                          </div>
                          <p className="small muted">
                            {c.id} ·{" "}
                            {c.source === "manual_claim"
                              ? "Unclaimed board claim"
                              : "Example possible match"}
                          </p>
                          <dl>
                            <dt>Private item detail</dt>
                            <dd>{item?.detail}</dd>
                            <dt>Owner’s description</dt>
                            <dd>{a?.answer}</dd>
                            <dt>Found location</dt>
                            <dd>{c.location}</dd>
                          </dl>
                          {c.photo && (
                            <img
                              className="review-photo"
                              src={c.photo}
                              alt="Private photo of the found item"
                            />
                          )}
                          <p className="small muted">
                            Compare the photos and details carefully. A similar
                            product alone does not prove ownership.
                          </p>
                          <div className="confirmation-row">
                            <button
                              className="primary"
                              onClick={() => review(c.id, true)}
                            >
                              Practice: approve claim <Check size={17} />
                            </button>
                            <button
                              className="secondary"
                              onClick={() => review(c.id, false)}
                            >
                              Reject claim
                            </button>
                          </div>
                        </article>
                      );
                    })}
                </div>
                {!submitted && (
                  <div className="empty">
                    <ClipboardCheck size={36} />
                    <h2>Nothing waiting for review.</h2>
                    <p>
                      Submit an ownership description to try the review flow.
                    </p>
                    {activeRecovery && (
                      <Link href="/recovery" className="primary">
                        Arrange the return <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    if (resetRequested) {
                      setData(structuredClone(seed));
                      notify(
                        "Practice changes cleared. Example items restored.",
                      );
                      setResetRequested(false);
                    } else setResetRequested(true);
                  }}
                >
                  {resetRequested
                    ? "Yes, clear my practice changes"
                    : "Start practice again"}
                </button>
                {resetRequested && (
                  <button
                    className="text-button"
                    onClick={() => setResetRequested(false)}
                  >
                    Cancel reset
                  </button>
                )}
                <h3 className="ledger-title">Past claim checks</h3>
                <div className="history">
                  {data.attempts.length ? (
                    data.attempts.map((a, i) => (
                      <div className="history-row" key={a.id}>
                        <span>
                          Attempt {i + 1} · {a.caseId}
                        </span>
                        <span>{a.result}</span>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No claims checked yet.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <footer>
          KHOJ <span>A little kindness goes a long way.</span>
          <span>Campus lost and found · Practice version</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            className="icon-button"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {dialog && (
        <Modal
          title={
            dialog.type === "register"
              ? "Make it yours."
              : dialog.type === "lost"
                ? "Let’s help it get back."
                : dialog.type === "verify"
                  ? "What makes it yours?"
                  : dialog.item.name
          }
          onClose={() => setDialog(null)}
        >
          {dialog.type === "register" ? (
            <RegisterForm
              onSave={(item) => {
                setData((d) => ({ ...d, items: [...d.items, item] }));
                setDialog(null);
                notify("Your item is saved.");
              }}
            />
          ) : dialog.type === "lost" ? (
            <LostForm
              item={dialog.item}
              onSave={(location, lostAt) => {
                setData((d) => ({
                  ...d,
                  items: d.items.map((i) =>
                    i.id === dialog.item.id
                      ? { ...i, status: "LOST", location, lostAt }
                      : i,
                  ),
                }));
                setDialog(null);
                notify("Item marked as lost.");
              }}
            />
          ) : dialog.type === "verify" ? (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                verify(
                  dialog.case,
                  String(f.get("answer")).trim(),
                  dialog.case.itemId || String(f.get("item")),
                );
              }}
            >
              <p className="muted">
                Describe a distinctive mark, engraving, damage, or accessory. We
                keep the found item’s private details hidden until its owner is
                confirmed.
              </p>
              {!dialog.case.itemId && (
                <label>
                  Which of your lost items is this?
                  <select name="item" required defaultValue="">
                    <option value="" disabled>
                      Select your item
                    </option>
                    {data.items
                      .filter((i) => i.status === "LOST")
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {!dialog.case.itemId &&
              !data.items.some((i) => i.status === "LOST") ? (
                <p className="notice">
                  Add your item and mark it as lost before claiming it.{" "}
                  <Link href="/items">Go to my items</Link>
                </p>
              ) : (
                <>
                  <label>
                    Your private item detail
                    <textarea
                      autoFocus
                      name="answer"
                      required
                      minLength={8}
                      maxLength={500}
                      placeholder="Tell us something only the owner would know…"
                    />
                  </label>
                  <p className="small muted">
                    <ShieldCheck size={16} /> A match is a possibility, not
                    proof. Your description will go to manual review.
                  </p>
                  <button className="primary">
                    Send for checking <ArrowRight size={17} />
                  </button>
                </>
              )}
            </form>
          ) : (
            <div className="form">
              <ProductArt
                art={dialog.item.art}
                photo={dialog.item.photos[0]}
                name={dialog.item.name}
              />
              <p>
                {dialog.item.category} · {dialog.item.brand || "No brand added"}
              </p>
              <span className={`status ${dialog.item.status.toLowerCase()}`}>
                {dialog.item.status}
              </span>
              <p className="notice">
                Your private item detail is saved privately for review.
              </p>
              {dialog.item.status === "SAFE" ? (
                <button
                  className="primary"
                  onClick={() => setDialog({ type: "lost", item: dialog.item })}
                >
                  Mark as lost <ArrowRight size={17} />
                </button>
              ) : dialog.item.status === "LOST" ? (
                <p className="muted">
                  This item is marked lost. Potential matches appear on your
                  overview.
                </p>
              ) : (
                <p className="positive">This item has made its way home.</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
