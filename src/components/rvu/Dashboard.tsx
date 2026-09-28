"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Package, Plus, Search, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { usePortal } from "./PortalProvider";
import { Guard } from "./Common";
import type { Report } from "@/lib/rvu/types";

function relativeTime(date: string | number, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
export default function Dashboard() {
  const { loading, data } = usePortal();
  if (loading) return <div className="kd-dashboard kd-loading" aria-busy="true" role="status"><span className="sr-only">Loading campus recovery dashboard</span><div /><div /><div /><div /></div>;
  if (!data.user?.verified) return <Guard><RecoveryDashboard /></Guard>;
  return <RecoveryDashboard />;
}
function RecoveryDashboard() {
  const { data, refresh, refreshing, lastUpdated, offline, error } = usePortal();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const active = data.reports.filter(r => r.status !== "returned" && r.status !== "closed").sort((a,b) => Number(Boolean(b.isMine)) - Number(Boolean(a.isMine)) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const returned = data.reports.filter(r => r.status === "returned");
  const activity = data.activity ?? [];
  const items = data.registeredItems ?? [];
  const pipeline = data.pipeline;
  const linked = data.user?.collegeIdStatus === "LINKED";
  const connected = !offline && !error && lastUpdated !== null;
  return <div className="kd-dashboard">
    <header className="kd-hero">
      <div className="kd-eyebrow">RV UNIVERSITY <span>/</span> CAMPUS RECOVERY</div>
      <div className="kd-hero-line"><div><h1>{greeting}, {data.user?.name.split(" ")[0]}.</h1><p>A little care. A campus full of possibilities.</p></div><div className="kd-live-block"><span className={`kd-live ${connected ? "connected" : ""}`}><i />{offline ? "Offline" : error ? "Connection interrupted" : refreshing ? "Updating…" : "Online"}</span><small>{lastUpdated ? `Updated ${relativeTime(lastUpdated, now).toLowerCase()}` : "Loading…"}</small></div></div>
      <div className="kd-overview"><span><strong>{data.stats.lost + data.stats.found}</strong> open reports</span><span><strong>{data.matches.length}</strong> potential matches for you</span><span><strong>{data.stats.returned}</strong> items returned</span></div>
      <div className="kd-actions"><span>What happened?</span><Link className="kd-button solid" href="/report/lost"><Search size={17} />I lost something<ArrowUpRight size={16} /></Link><Link className="kd-button" href="/report/found"><Plus size={18} />I found something<ArrowUpRight size={16} /></Link><Link className="kd-subtle-link" href="/board">Browse campus board <ArrowRight size={15}/></Link></div>
    </header>
    {(offline || error) && <div className="kd-connection" role="status"><WifiOff size={17}/><div><strong>{offline ? "You’re offline." : "Campus updates are unavailable."}</strong><p>Showing the most recently loaded activity. {error && !offline ? error : "Updates will resume when you reconnect."}</p></div><button className="kd-button" disabled={refreshing} onClick={() => void refresh()}>Try again</button></div>}
    {data.matches.length > 0 && <Link href="/status" className="kd-attention"><span className="kd-attention-icon"><Search size={18}/></span><div><strong>Something might be yours.</strong><span>{data.matches.length} potential {data.matches.length === 1 ? "match is" : "matches are"} ready for you to review.</span></div><span className="kd-attention-cta">Review matches <ArrowRight size={16}/></span></Link>}
    <div className="kd-workspace">
      <section className="kd-recoveries" aria-labelledby="recoveries-heading"><div className="kd-section-title"><div><span className="kd-eyebrow">MOVING THINGS FORWARD</span><h2 id="recoveries-heading">Active recoveries <span>{data.reports.filter(r => !["returned", "closed"].includes(r.status)).length}</span></h2></div><Link href="/board">View all <ArrowUpRight size={14}/></Link></div>
        {active.length ? <div className="kd-recovery-list">{active.map(report => <RecoveryRow key={report.id} report={report} matched={data.matches.some(m => m.foundId === report.id || m.lostId === report.id)}/>)}</div> : <div className="kd-empty"><Package size={26} strokeWidth={1.4}/><h3>No active recoveries</h3><p>When something is reported lost or found, its recovery starts here.</p><Link href="/report/found">Report a found item <ArrowRight size={14}/></Link></div>}
        <section className="kd-pipeline" aria-label="Where items are in the process"><div className="kd-section-title"><h3>Where items are</h3><span>Current campus totals</span></div><ol>{[["Found", pipeline?.found ?? data.stats.found], ["Matching", pipeline?.matching ?? 0], ["Checking", pipeline?.verification ?? 0], ["Returned", pipeline?.returned ?? data.stats.returned]].map(([label,value], i) => <li key={label}><span>{label}{i < 3 && <ArrowRight size={13}/>}</span><strong>{value}</strong></li>)}</ol></section>
      </section>
      <section className="kd-activity" aria-labelledby="activity-heading"><div className="kd-section-title"><div><span className="kd-eyebrow">AROUND YOU</span><h2 id="activity-heading">Campus activity</h2></div><button className="kd-icon-button" aria-label="Refresh campus activity" disabled={refreshing} onClick={() => void refresh()}><RefreshCw size={16} className={refreshing ? "rv-spin" : ""}/></button></div><div className="kd-feed-status"><i className={connected ? "connected" : ""}/>{connected ? "Updates automatically" : "Recent campus events"}</div>
        {activity.length ? <ol className="kd-feed">{activity.slice(0, 6).map(event => <li key={event.id}><span className={`kd-event-dot ${event.type === "returned" ? "returned" : ""}`}>{event.type === "returned" && <Check size={10}/>}</span><time dateTime={event.createdAt} title={new Date(event.createdAt).toLocaleString("en-IN")}>{relativeTime(event.createdAt, now)}</time>{event.reportId ? <Link href={`/items/${event.reportId}`}>{event.title}</Link> : <strong>{event.title}</strong>}{event.location && <p>{event.location}</p>}</li>)}</ol> : <div className="kd-empty kd-empty-feed"><h3>A quiet moment on campus.</h3><p>New reports and recovery updates will appear here as they happen.</p></div>}
        <Link className="kd-subtle-link" href="/status">Your report activity <ArrowRight size={14}/></Link>
      </section>
    </div>
    <div className="kd-bottom"><section className="kd-my-items" aria-labelledby="items-heading"><div className="kd-section-title"><div><span className="kd-eyebrow">A LITTLE PEACE OF MIND</span><h2 id="items-heading">My items <span>{items.length}</span></h2></div><Link href="/my-items">Manage items <ArrowUpRight size={14}/></Link></div>{items.length ? <div className="kd-owned-list">{items.slice(0,3).map(item => <Link href={item.lostReportId ? `/items/${item.lostReportId}` : "/my-items"} key={item.id}><Package size={17}/><span>{item.name}</span><small className={item.status === "safe" || item.status === "returned" ? "kd-safe" : ""}>{item.status === "safe" ? "Safe" : item.status === "lost" ? "Reported lost" : item.status === "returned" ? "Returned" : item.status}</small><ArrowUpRight size={14}/></Link>)}</div> : <div className="kd-register-row"><Package size={25} strokeWidth={1.3}/><div><strong>Give your belongings a head start.</strong><p>Keep identifying details ready, before anything goes missing.</p></div><Link className="kd-button" href="/my-items"><Plus size={16}/>Register an item</Link></div>}</section><aside className="kd-identity"><ShieldCheck size={21} strokeWidth={1.5}/><span className="kd-eyebrow">CAMPUS IDENTITY</span><h3>{linked ? "Your college ID is linked." : data.user?.collegeIdStatus === "REQUIRES_REVIEW" ? "Your college ID is under review." : "One campus. One identity."}</h3><p>{linked ? "Your campus identity is connected to KHOJ." : "Connect your existing college ID to make returning it simpler."}</p><Link href="/profile">{linked ? "View your campus ID" : "Manage campus ID"}<ArrowRight size={14}/></Link></aside></div>
    {returned.length > 0 && <div className="kd-return-moment"><Check size={19}/><span><strong>{returned.length} {returned.length === 1 ? "item" : "items"} back where {returned.length === 1 ? "it belongs" : "they belong"}.</strong> Small acts of care make this campus a community.</span><Link href="/board">See campus board <ArrowRight size={14}/></Link></div>}
  </div>;
}
function RecoveryRow({ report, matched }: { report: Report; matched: boolean }) {
  const state = report.status === "approved" ? "Ready for collection" : report.status === "in_custody" ? "In safe custody" : matched ? "Potential match found" : report.kind === "lost" ? "Looking for this item" : "Looking for its owner";
  return <Link href={`/items/${report.id}`} className="kd-recovery-row"><span className="kd-thumbnail">{report.imageId ? <img src={`/api/rvu/images/${report.imageId}`} alt="" loading="lazy"/> : <Package size={22} strokeWidth={1.4}/>}</span><div className="kd-case-copy"><strong>{report.title}{report.isMine && <small>Your report</small>}</strong><p>{report.kind === "found" ? "Found" : "Lost"} · {report.location}</p></div><div className="kd-case-state"><span className={matched || report.status === "approved" ? "kd-safe" : ""}>{state}</span><small>{report.id}</small></div><ArrowUpRight size={17}/></Link>;
}
