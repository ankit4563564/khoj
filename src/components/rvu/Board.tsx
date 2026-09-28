"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  RefreshCw,
  PackageSearch,
  PackageCheck,
  ShieldCheck,
  CircleCheck,
} from "lucide-react";
import { usePortal } from "./PortalProvider";
import { Empty, Guard, ReportCard } from "./Common";
import { categories } from "@/lib/rvu/types";
export default function Dashboard() {
  return (
    <Guard>
      <Board />
    </Guard>
  );
}
function Board() {
  const { data, refresh } = usePortal();
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [category, setCategory] = useState("all"),
    [location, setLocation] = useState("all"),
    [sort, setSort] = useState("newest"),
    [refreshing, setRefreshing] = useState(false);
  const filtered = data.reports
    .filter(
      (r) =>
        (kind === "all" ||
          (kind === "returned"
            ? r.status === "returned"
            : r.kind === kind &&
              r.status !== "returned" &&
              r.status !== "closed")) &&
        (category === "all" || r.category === category) &&
        (location === "all" || r.location === location) &&
        `${r.title} ${r.description} ${r.brand} ${r.color} ${r.id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <div className="rv-board">
      <div className="rv-page-heading">
        <div>
          <span className="rv-eyebrow">RV UNIVERSITY / CAMPUS BOARD</span>
          <h1>Let’s bring it back.</h1>
          <p>
            Hi {data.user?.name.split(" ")[0]}. One campus, looking out for each
            other.
          </p>
        </div>
        <div className="rv-actions">
          <Link className="rv-button" href="/report/lost">
            + Report Lost
          </Link>
          <Link className="rv-button primary" href="/report/found">
            + Report Found <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="rv-stats">
        {[
          {
            label: "Lost items",
            n: data.stats.lost,
            Icon: PackageSearch,
            tone: "blue",
          },
          {
            label: "Found on campus",
            n: data.stats.found,
            Icon: PackageCheck,
            tone: "purple",
          },
          {
            label: "In safe custody",
            n: data.stats.custody,
            Icon: ShieldCheck,
            tone: "amber",
          },
          {
            label: "Happy reunions",
            n: data.stats.returned,
            Icon: CircleCheck,
            tone: "green",
          },
        ].map(({ label, n, Icon, tone }) => (
          <div key={label} className="rv-stat">
            <div>
              <span>{label}</span>
              <strong>{n.toString().padStart(2, "0")}</strong>
            </div>
            <span className={`rv-stat-icon ${tone}`}>
              <Icon size={23} strokeWidth={1.5} />
            </span>
          </div>
        ))}
      </div>
      {data.matches.length > 0 && (
        <section className="rv-match-banner">
          <Sparkles size={23} />
          <div>
            <strong>Something looks familiar.</strong>
            <p>
              {data.matches.length} possible{" "}
              {data.matches.length === 1 ? "match" : "matches"} for your lost
              reports. Review the details before claiming.
            </p>
          </div>
          <Link href="/status" className="rv-button">
            View matches <ArrowUpRight size={16} />
          </Link>
        </section>
      )}
      <section className="rv-browse">
        <div className="rv-section-heading">
          <h2>
            On the campus board{" "}
            <span className="rv-count">{data.reports.length}</span>
          </h2>
          <button
            className="rv-text-button"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          >
            <RefreshCw size={14} className={refreshing ? "rv-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="rv-board-tabs" role="group" aria-label="Report type">
          {[
            ["all", "All items"],
            ["lost", "Lost"],
            ["found", "Found"],
            ["returned", "Reunited"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={kind === value ? "selected" : ""}
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rv-filters">
          <label className="rv-search">
            <Search size={18} />
            <input
              aria-label="Search reports"
              placeholder="Search for an item, colour, brand or report ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="rv-filter-select">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="rv-filter-select">
            <MapPin size={15} />
            <select
              aria-label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="all">Everywhere on campus</option>
              {Array.from(new Set(data.reports.map((r) => r.location))).map(
                (l) => (
                  <option key={l}>{l}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <div className="rv-results-line">
          <span>
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
            {query ? " matching your search" : " on the board"}
          </span>
          <select
            aria-label="Sort reports"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="rv-item-grid">
            {filtered.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <Empty
            title={
              data.reports.length
                ? "No items match your search"
                : "A fresh start for your campus."
            }
            description={
              data.reports.length
                ? "Try another keyword or choose a different filter."
                : "The board is ready. Report something you lost or found to get the first reunion started."
            }
            href={data.reports.length ? undefined : "/report/found"}
            label="Report a found item"
          />
        )}
      </section>
      <div className="rv-board-note">
        <ShieldCheck size={17} />
        <span>
          Found something? Keep it safe and hand it to authorised staff.
          Ownership is verified before collection.
        </span>
      </div>
    </div>
  );
}
