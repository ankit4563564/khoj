"use client";
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Search, ArrowUpRight } from "lucide-react";
import { usePortal } from "./PortalProvider";
import { StaffIdCheck } from './RecoveryPanel';
import { Empty, ErrorBox, formatDate, Guard, Status } from "./Common";
export default function StaffPage() {
  return (
    <Guard staff>
      <Staff />
    </Guard>
  );
}
function Staff() {
  const { data, act, toast } = usePortal();
  const [tab, setTab] = useState("claims"),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const found = data.reports.filter(
    (r) =>
      r.kind === "found" &&
      `${r.title} ${r.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function submit(
    e: React.FormEvent<HTMLFormElement>,
    action: string,
    extra: Record<string, unknown>,
  ) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    try {
      await act(action, {
        ...Object.fromEntries(new FormData(form)),
        ...extra,
      });
      toast("Record updated. The student has been notified.");
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="rv-page-heading">
        <div>
          <span className="rv-eyebrow">CAMPUS STAFF · RV UNIVERSITY</span>
          <h1>Staff desk.</h1>
          <p>Receive items, check ownership, and confirm every safe return.</p>
        </div>
        <span className="rv-staff-badge">
          <ShieldCheck size={18} />
          Staff access
        </span>
      </div>
      <div className="rv-stats">
        {[
          [
            "Pending claims",
            data.claims.filter((c) => c.status === "pending").length,
          ],
          ["Awaiting custody", found.filter((r) => r.status === "open").length],
          [
            "Ready to collect",
            data.claims.filter((c) => c.status === "approved").length,
          ],
          ["Returned", data.stats.returned],
        ].map(([label, n]) => (
          <div className="rv-stat" key={label}>
            <div>
              <span>{label}</span>
              <strong>{n.toString().padStart(2, "0")}</strong>
            </div>
          </div>
        ))}
      </div>
      <ErrorBox message={error} />
      <div className="rv-board-tabs" role="group" aria-label="Staff view">
        {[
          ["claims", "Ownership claims"],
          ["inventory", "Custody inventory"],
          ["audit", "Handover & activity log"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "claims" &&
        (data.claims.length ? (
          <div className="rv-claim-list">
            {data.claims.map((c) => {
              const r = data.reports.find((r) => r.id === c.reportId);
              return (
                <article className="rv-panel" key={c.id}>
                  <div className="rv-between">
                    <div>
                      <Link
                        className="rv-inline-link"
                        href={`/items/${c.reportId}`}
                      >
                        <h3>{c.reportTitle}</h3>
                        <ArrowUpRight size={15} />
                      </Link>
                      <small>
                        {formatDate(c.createdAt)} · {c.reportId}
                      </small>
                    </div>
                    <Status value={c.status} />
                  </div>
                  <div className="rv-staff-evidence">
                    <div>
                      <span className="rv-eyebrow">CLAIMANT</span>
                      <strong>{c.claimantName}</strong>
                      <p>{c.claimantEmail}</p>
                      <p>
                        Student ID:{" "}
                        {c.claimantStudentId || "Check physical university ID"}
                      </p>
                    </div>
                    <div>
                      <span className="rv-eyebrow">
                        PROOF IT&apos;S THEIRS
                      </span>
                      <p>{c.proof}</p>
                    </div>
                    <div>
                      <span className="rv-eyebrow">
                        FINDER&apos;S PRIVATE NOTE
                      </span>
                      <p>
                        {r?.privateDetail ||
                          "No private detail supplied. Verify against the physical item."}
                      </p>
                    </div>
                  </div>
                  {c.status === "pending" && (
                    <form
                      className="rv-staff-action"
                      onSubmit={(e) =>
                        void submit(e, "review_claim", { claimId: c.id })
                      }
                    >
                      <label className="rv-field">
                        REVIEW NOTE
                        <textarea
                          name="note"
                          required
                          minLength={5}
                          maxLength={1000}
                          placeholder="Record the evidence checked and your decision."
                          rows={2}
                        />
                      </label>
                      <div className="rv-actions">
                        <select name="decision" aria-label="Claim decision">
                          <option value="approved">Approve ownership</option>
                          <option value="rejected">Reject claim</option>
                        </select>
                        <button className="rv-button primary" disabled={busy}>
                          Save decision
                        </button>
                      </div>
                      {r?.status === "open" && (
                        <p className="rv-helper">
                          Mark the item as received under Custody inventory
                          before approving this claim.
                        </p>
                      )}
                    </form>
                  )}
                  {c.status === 'approved'&&<StaffIdCheck reportId={c.reportId}/>}
                  {c.status === "approved" && (
                    <form
                      className="rv-staff-action"
                      onSubmit={(e) =>
                        void submit(e, "return_item", { claimId: c.id })
                      }
                    >
                      <label className="rv-field">
                        HANDOVER RECORD
                        <textarea
                          name="note"
                          required
                          minLength={5}
                          maxLength={1000}
                          rows={2}
                          placeholder="Record the identity check and handover details."
                        />
                      </label>
                      <label className="rv-checkbox">
                        <input type="checkbox" required />I checked the
                        claimant’s university ID and physically handed over the
                        item.
                      </label>
                      <button className="rv-button primary" disabled={busy}>
                        Confirm item handed to owner
                      </button>
                    </form>
                  )}
                  {["returned", "rejected"].includes(c.status) && (
                    <p className="rv-review-note">{c.staffNote}</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            title="No claims waiting."
            description="Student ownership claims will appear here for private review."
          />
        ))}
      {tab === "inventory" && (
        <>
          <label className="rv-search rv-space-top">
            <Search size={18} />
            <input
              aria-label="Search custody inventory"
              placeholder="Search item or report ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {found.length ? (
            <div className="rv-claim-list">
              {found.map((r) => (
                <article className="rv-panel" key={r.id}>
                  <div className="rv-between">
                    <Link className="rv-inline-link" href={`/items/${r.id}`}>
                      <h3>{r.title}</h3>
                      <ArrowUpRight size={16} />
                    </Link>
                    <Status value={r.status} />
                  </div>
                  <p>
                    {r.id} · Found at {r.location} · {r.reporterName}
                  </p>
                  {r.custodyLocation && (
                    <p>
                      Custody desk: <strong>{r.custodyLocation}</strong>
                    </p>
                  )}
                  {r.status === "open" && (
                    <form
                      className="rv-staff-action"
                      onSubmit={(e) =>
                        void submit(e, "custody", { reportId: r.id })
                      }
                    >
                      <label className="rv-field">
                        WHERE IS THE ITEM STORED?
                        <input
                          name="custodyLocation"
                          required
                          minLength={3}
                          maxLength={150}
                          placeholder="e.g. RVU Library reception, locker 2"
                        />
                      </label>
                      <label className="rv-checkbox">
                        <input type="checkbox" required />I have received this
                        item and placed it in a safe place.
                      </label>
                      <button className="rv-button primary" disabled={busy}>
                        Confirm item received
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No inventory items."
              description="Found reports will appear here for receipt into custody."
            />
          )}
        </>
      )}
      {tab === "audit" &&
        (data.audit.length ? (
          <div className="rv-table-wrap">
            <table className="rv-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Report</th>
                  <th>Activity</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.createdAt).toLocaleString("en-IN")}</td>
                    <td>
                      <Link href={`/items/${a.reportId}`}>{a.reportId}</Link>
                    </td>
                    <td>{a.action}</td>
                    <td>{a.actorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="A clear record, from the start."
            description="Reports, custody receipts, claim decisions and handovers will be recorded here."
          />
        ))}
    </div>
  );
}
