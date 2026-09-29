"use client";
import Link from "next/link";
import { usePortal } from "./PortalProvider";
import {
  Package,
  ArrowUpRight,
  MapPin,
  CalendarDays,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import type { Report } from "@/lib/rvu/types";
export const formatDate = (date: string) =>
  new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" },
  );
const statusLabels: Record<string, string> = {
  open: "Open",
  in_custody: "With staff",
  approved: "Ready to collect",
  pending: "Waiting for staff",
  rejected: "Not approved",
  returned: "Returned",
  closed: "Closed",
  safe: "Safe",
  lost: "Reported lost",
};
export function Status({ value }: { value: string }) {
  return (
    <span className={`rv-status ${value}`}>
      {statusLabels[value] || value.replaceAll("_", " ")}
    </span>
  );
}
export function claimStatusSentence(status: string) {
  if (status === "pending") return "Your claim is waiting for staff review.";
  if (status === "approved") return "Your claim is approved — you can collect the item.";
  if (status === "rejected") return "Your claim was not approved.";
  if (status === "returned") return "Your item has been returned.";
  return `Your claim status: ${statusLabels[status] || status}.`;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="rv-error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Empty({
  title,
  description,
  href,
  label,
  onClick,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <div className="rv-empty">
      <span className="rv-empty-icon">
        <Package size={29} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onClick && (
        <button className="rv-button primary" type="button" onClick={onClick}>
          {label}
          <ArrowUpRight size={16} />
        </button>
      )}
      {href && !onClick && (
        <Link className="rv-button primary" href={href}>
          {label}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Guard({
  children,
  staff = false,
}: {
  children: React.ReactNode;
  staff?: boolean;
}) {
  const { data, loading, error, refresh, act } = usePortal();
  if (loading)
    return (
      <div className="rv-loading" role="status">
        <RefreshCw className="rv-spin" />
        Loading your campus…
      </div>
    );
  if (error && !data.user)
    return (
      <div className="rv-panel">
        <ErrorBox message={error} />
        <button className="rv-button" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  if (!data.user)
    return (
      <div className="rv-gate">
        <LockKeyhole size={36} />
        <span className="rv-eyebrow">RV UNIVERSITY COMMUNITY</span>
        <h1>Your campus. Your people.</h1>
        <p>
          Log in with your university account to browse reports and help an item
          find its way home.
        </p>
        <Link className="rv-button primary" href="/login">
          Log in to continue <ArrowUpRight size={17} />
        </Link>
        <Link className="rv-text-button" href="/signup">
          New here? Create an account
        </Link>
      </div>
    );
  if (!data.user.verified) return <VerifyNotice />;
  if (staff && data.user.role !== "staff")
    return (
      <div className="rv-gate">
        <LockKeyhole size={36} />
        <h1>Staff access only</h1>
        <p>
          The staff desk is for authorised campus staff. Student accounts cannot
          approve claims or confirm returns.
        </p>
        <Link className="rv-button" href="/dashboard">
          Back to home
        </Link>
      </div>
    );
  return <>{children}</>;
}
function VerifyNotice() {
  const { act, data } = usePortal();
  const [state, setState] = useState({ message: "", link: "" });
  return (
    <div className="rv-gate">
      <LockKeyhole size={36} />
      <h1>Verify your university email</h1>
      <p>
        We need to confirm that you can access {data.user?.email} before you
        enter the campus board.
      </p>
      <button
        className="rv-button primary"
        onClick={async () => {
          try {
            const r = await act("resend");
            setState({
              message: r.message || "",
              link: r.developmentLink || "",
            });
          } catch (e) {
            setState({ message: (e as Error).message, link: "" });
          }
        }}
      >
        Send verification link
      </button>
      {state.message && <p role="status">{state.message}</p>}
      {state.link && (
        <div className="rv-dev-note">
          Email is not connected here.{" "}
          <Link href={state.link}>Open verification link →</Link>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
export function ReportCard({ report }: { report: Report }) {
  return (
    <Link href={`/items/${report.id}`} className="rv-item-card">
      <div className={`rv-item-photo ${report.kind}`}>
        {report.imageId ? (
          <img
            src={`/api/rvu/images/${report.imageId}`}
            alt={report.title}
            loading="lazy"
          />
        ) : (
          <Package size={48} strokeWidth={1.2} />
        )}
        <span className={`rv-kind ${report.kind}`}>
          {report.kind === "lost" ? "LOST" : "FOUND"}
        </span>
        <span className="rv-card-arrow">
          <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="rv-item-content">
        <div className="rv-between">
          <small>{report.category}</small>
          <Status value={report.status} />
        </div>
        <h3>{report.title}</h3>
        <p>{report.description}</p>
        <div className="rv-item-meta">
          <span>
            <MapPin size={13} />
            {report.location}
          </span>
          <span>
            <CalendarDays size={13} />
            {formatDate(report.date)}
          </span>
        </div>
      </div>
    </Link>
  );
}
