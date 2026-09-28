"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { usePortal } from "./PortalProvider";
import { Empty, formatDate, Guard, ReportCard, Status } from "./Common";
import { RecoveryPanel } from './RecoveryPanel';
export default function StatusPage() {
  return (
    <Guard>
      <Tracking />
    </Guard>
  );
}
function Tracking() {
  const { data } = usePortal(),
    [tab, setTab] = useState("reports");
  const mine = data.reports.filter((r) => r.isMine);
  return (
    <div>
      <div className="rv-page-heading">
        <div>
          <span className="rv-eyebrow">YOUR RECOVERY JOURNEY</span>
          <h1>My reports.</h1>
          <p>Your lost and found reports, possible matches, and claims — in one place.</p>
        </div>
        <Link href="/report/lost" className="rv-button primary">
          + New report <ArrowUpRight size={16} />
        </Link>
      </div>
      <RecoveryPanel/>
      <div className="rv-board-tabs" role="group" aria-label="Status view">
        {[
          ["reports", `My reports (${mine.length})`],
          ["matches", `Possible matches (${data.matches.length})`],
          ["claims", `My claims (${data.claims.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={tab === key ? "selected" : ""}
            aria-pressed={tab === key}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "reports" &&
        (mine.length ? (
          <div className="rv-item-grid rv-space-top">
            {mine.map((report) => (
              <ReportCard report={report} key={report.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="Your story starts here."
            description="You haven’t reported an item yet. Your reports and progress will appear here."
            href="/report/lost"
            label="Report a lost item"
          />
        ))}
      {tab === "matches" &&
        (data.matches.length ? (
          <div className="rv-match-list">
            {data.matches.map((m) => (
              <Link
                className="rv-match-row"
                href={`/items/${m.foundId}`}
                key={m.id}
              >
                <span className="rv-match-icon">
                  <Sparkles size={25} />
                </span>
                <div>
                  <h3>{m.title}</h3>
                  <p>
                    {m.location} · Suggested for{" "}
                    {mine.find((r) => r.id === m.lostId)?.title}
                  </p>
                  <small>
                    Based on category, description, colour, location and date.
                    Ownership is not yet verified.
                  </small>
                </div>
                <span className="rv-match-score">
                  {m.score}%<small>how similar</small>
                </span>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="We’re keeping an eye out."
            description="Possible matches will appear when a found item has details similar to one of your open lost reports."
          />
        ))}
      {tab === "claims" &&
        (data.claims.length ? (
          <div className="rv-claim-list">
            {data.claims.map((c) => (
              <article className="rv-panel" key={c.id}>
                <div className="rv-between">
                  <Link href={`/items/${c.reportId}`}>
                    <h3>
                      {c.reportTitle} <ArrowUpRight size={15} />
                    </h3>
                  </Link>
                  <Status value={c.status} />
                </div>
                <small>Submitted {formatDate(c.createdAt)}</small>
                <div className="rv-timeline">
                  {[
                    "Submitted",
                    "Staff review",
                    "Ready to collect",
                    "Returned",
                  ].map((label, i) => (
                    <div
                      key={label}
                      className={
                        (c.status === "returned"
                          ? 3
                          : c.status === "approved"
                            ? 2
                            : 0) >= i
                          ? "complete"
                          : ""
                      }
                    >
                      <span>{i + 1}</span>
                      {label}
                    </div>
                  ))}
                </div>
                {c.status === "rejected" ? (
                  <p className="rv-review-note">
                    Claim declined: {c.staffNote}
                  </p>
                ) : (
                  <p className="rv-review-note">
                    {c.status === "approved"
                      ? `Ready for collection at ${data.reports.find((r) => r.id === c.reportId)?.custodyLocation}. Bring your university ID. `
                      : c.status === "returned"
                        ? "Handover complete. Your item is back where it belongs. "
                        : "Your private evidence is waiting for staff review. "}
                    {c.staffNote}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="No claims just yet."
            description="See something that belongs to you on the found board? Open it and submit your ownership evidence."
            href="/board"
            label="Browse campus board"
          />
        ))}
    </div>
  );
}
