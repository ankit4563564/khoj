"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Package,
  ShieldCheck,
  LockKeyhole,
  CheckCircle2,
} from "lucide-react";
import { usePortal } from "./PortalProvider";
import { BlindVerification } from './RecoveryPanel';
import { Empty, ErrorBox, formatDate, Guard, Status, claimStatusSentence } from "./Common";
export default function ItemDetail({ id }: { id: string }) {
  return (
    <Guard>
      <Detail id={id} />
    </Guard>
  );
}
function Detail({ id }: { id: string }) {
  const { data, act, toast } = usePortal();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmClose, setConfirmClose] = useState(false);
  const item = data.reports.find((r) => r.id === id),
    myClaim = data.claims.find((c) => c.reportId === id);
  if (!item)
    return (
      <Empty
        title="Report not found"
        description="This report may no longer be available. Check the campus board."
        href="/board"
        label="Back to campus board"
      />
    );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await act("claim", {
        ...Object.fromEntries(new FormData(e.currentTarget)),
        reportId: id,
      });
      toast("Claim sent to staff for verification.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rv-detail">
      <Link href="/board" className="rv-back">
        <ArrowLeft size={16} />
        Back to campus board
      </Link>
      <div className="rv-detail-grid">
        <div className="rv-detail-image">
          {item.imageId ? (
            <img src={`/api/rvu/images/${item.imageId}`} alt={item.title} />
          ) : (
            <div>
              <Package size={76} strokeWidth={1} />
              <span>No photo attached</span>
            </div>
          )}
          <span className={`rv-kind ${item.kind}`}>
            {item.kind.toUpperCase()}
          </span>
        </div>
        <section>
          <div className="rv-between">
            <span className="rv-eyebrow">{item.category}</span>
            <Status value={item.status} />
          </div>
          <h1>{item.title}</h1>
          <p className="rv-detail-description">{item.description}</p>
          <dl className="rv-detail-facts">
            <div>
              <dt>
                <MapPin size={16} />
                Location
              </dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={16} />
                {item.kind === "lost" ? "Date lost" : "Date found"}
              </dt>
              <dd>{formatDate(item.date)}</dd>
            </div>
            <div>
              <dt>Colour</dt>
              <dd>{item.color || "Not specified"}</dd>
            </div>
            <div>
              <dt>Brand</dt>
              <dd>{item.brand || "Not specified"}</dd>
            </div>
            <div>
              <dt>School</dt>
              <dd>{item.department}</dd>
            </div>
            <div>
              <dt>Report reference</dt>
              <dd className="rv-mono">{item.id}</dd>
            </div>
          </dl>
          {item.custodyLocation && (
            <div className="rv-custody">
              <ShieldCheck size={21} />
              <div>
                <strong>In safe hands</strong>
                <p>{item.custodyLocation}</p>
              </div>
            </div>
          )}
          {item.privateDetail && (
            <div className="rv-private">
              <LockKeyhole size={17} />
              <div>
                <strong>Private identifying detail</strong>
                <p>{item.privateDetail}</p>
              </div>
            </div>
          )}
          <ErrorBox message={error} />
          {!myClaim&&item.kind==='found'&&!item.isMine&&['open','in_custody'].includes(item.status)&&<BlindVerification reportId={id}/>}
          {myClaim ? (
            <div className="rv-panel rv-claim-status">
              <CheckCircle2 size={23} />
              <h3>{claimStatusSentence(myClaim.status)}</h3>
              <p>
                {myClaim.staffNote ||
                  "Staff will review your proof. Check My Reports for updates."}
              </p>
              <Link href="/status" className="rv-inline-link">
                Track your claim →
              </Link>
            </div>
          ) : item.kind === "found" &&
            !item.isMine &&
            ["open", "in_custody"].includes(item.status) ? (
            <form className="rv-panel rv-claim-form" onSubmit={submit}>
              <h2>Does this belong to you?</h2>
              <p>
                Describe something only the owner would know. Staff will verify
                your claim before collection.
              </p>
              <label className="rv-field">
                LINK YOUR LOST REPORT{" "}
                <span className="rv-optional">optional</span>
                <select name="lostReportId" defaultValue="">
                  <option value="">No linked report</option>
                  {data.reports
                    .filter(
                      (r) =>
                        r.isMine && r.kind === "lost" && r.status === "open",
                    )
                    .map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="rv-field">
                PROOF IT&apos;S YOURS
                <textarea
                  name="proof"
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={4}
                  placeholder="Describe a mark, what’s inside, or another detail that proves it is yours."
                />
              </label>
              <button className="rv-button primary" disabled={busy}>
                {busy ? "Submitting…" : "Submit ownership claim"}
              </button>
            </form>
          ) : null}
          {item.isMine && item.kind === "lost" && item.status === "open" && (
            <div className="rv-panel">
              <h3>Found it yourself?</h3>
              <p>
                Close the report so it no longer receives match suggestions.
              </p>
              {confirmClose ? (
                <div className="rv-actions">
                  <button
                    className="rv-button primary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await act("close_report", { reportId: id });
                        toast("Report closed. Glad you found it!");
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Yes, close report
                  </button>
                  <button
                    className="rv-button"
                    onClick={() => setConfirmClose(false)}
                  >
                    Keep open
                  </button>
                </div>
              ) : (
                <button
                  className="rv-button"
                  onClick={() => setConfirmClose(true)}
                >
                  I found my item
                </button>
              )}
            </div>
          )}
          {item.isMine && item.kind === "found" && item.status === "open" && (
            <div className="rv-custody">
              <ShieldCheck />
              <p>
                Keep this item safe and take it to authorised campus staff. They
                will record receipt into custody.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
