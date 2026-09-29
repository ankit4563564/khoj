"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
  PlusCircle,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Package,
  Building2,
  Camera,
} from "lucide-react";
import { usePortal } from "./PortalProvider";
import { categories } from "@/lib/rvu/types";

export default function About() {
  const { data } = usePortal();
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  const reports = data?.reports || [];
  const filtered = reports
    .filter((r) => {
      const matchesQuery =
        !query ||
        `${r.title} ${r.description} ${r.location} ${r.category}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCat =
        selectedCat === "all" || r.category === selectedCat;
      return matchesQuery && matchesCat;
    })
    .slice(0, 8);

  const quickCategories = [
    "all",
    "Electronics",
    "Cards & IDs",
    "Keys",
    "Bottles & Tumblers",
    "Bags & Backpacks",
    "Books & Notes",
  ];

  return (
    <div className="kh-mobile-home">
      {/* Top Banner */}
      <div className="kh-hero-top">
        <span className="kh-campus-pill">
          <span className="kh-green-dot" />
          RV University • Lost & Found
        </span>
        <h1 className="kh-hero-title">
          Lost something on campus?
          <br />
          <span className="kh-hero-highlight">Let&apos;s get it back.</span>
        </h1>
        <p className="kh-hero-subtitle">
          Fast, simple, and safe. Report lost or found items in 30 seconds.
        </p>

        {/* 2 Big Mobile Touch Buttons */}
        <div className="kh-action-grid">
          <Link href="/report/lost" className="kh-action-card kh-action-lost">
            <div className="kh-action-icon kh-icon-lost">
              <Search size={24} strokeWidth={2.2} />
            </div>
            <div className="kh-action-text">
              <strong>I Lost Something</strong>
              <span>Describe it so we can find a match</span>
            </div>
          </Link>

          <Link href="/report/found" className="kh-action-card kh-action-found">
            <div className="kh-action-icon kh-icon-found">
              <PlusCircle size={24} strokeWidth={2.2} />
            </div>
            <div className="kh-action-text">
              <div className="kh-action-title-row">
                <strong>I Found Something</strong>
                <span className="kh-tag-pill">No login needed</span>
              </div>
              <span>Snap a quick photo and help an owner</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Live Search & Filter Bar */}
      <section className="kh-search-section">
        <div className="kh-search-box">
          <Search size={18} className="kh-search-icon" />
          <input
            type="text"
            placeholder="Search items (e.g. keys, ID card, AirPods, bottle)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="kh-search-input"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="kh-clear-btn"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Category Pills (Horizontal scrolling for phone thumbs) */}
        <div className="kh-category-pills">
          {quickCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`kh-pill ${selectedCat === cat ? "active" : ""}`}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Recent Items Feed */}
      <section className="kh-feed-section">
        <div className="kh-feed-header">
          <div>
            <h2>Recent Campus Items</h2>
            <p>Check if your missing item is already here</p>
          </div>
          <Link href="/board" className="kh-view-all-link">
            See all ({reports.length}) <ArrowRight size={15} />
          </Link>
        </div>

        {filtered.length > 0 ? (
          <div className="kh-items-grid">
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="kh-item-card"
              >
                <div className="kh-item-thumb">
                  {item.imageId ? (
                    <img
                      src={`/api/rvu/images/${item.imageId}`}
                      alt={item.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="kh-item-placeholder">
                      <Package size={28} strokeWidth={1.5} />
                    </div>
                  )}
                  <span
                    className={`kh-item-badge ${
                      item.kind === "found" ? "found" : "lost"
                    }`}
                  >
                    {item.kind === "found" ? "FOUND" : "LOST"}
                  </span>
                </div>

                <div className="kh-item-info">
                  <h3 className="kh-item-title">{item.title}</h3>
                  <div className="kh-item-meta">
                    <span className="kh-meta-row">
                      <MapPin size={13} />
                      {item.location || "RVU Campus"}
                    </span>
                    <span className="kh-meta-row">
                      <Clock size={13} />
                      {item.date || "Recent"}
                    </span>
                  </div>
                  <span className="kh-claim-cta">
                    {item.kind === "found" ? "Is this yours? View →" : "View Details →"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="kh-empty-card">
            <Package size={36} strokeWidth={1.4} />
            <h3>No items found</h3>
            <p>
              {query
                ? `No items match "${query}". Try searching for something else.`
                : "No active reports yet. Be the first to report!"}
            </p>
            <div className="kh-empty-buttons">
              <Link href="/report/lost" className="kh-empty-btn lost">
                Report Lost Item
              </Link>
              <Link href="/report/found" className="kh-empty-btn found">
                Report Found Item
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* How It Works (Simple 3 Steps) */}
      <section className="kh-steps-section">
        <h2>How KHOJ Works</h2>
        <div className="kh-steps-row">
          <div className="kh-step-box">
            <div className="kh-step-num">1</div>
            <h3>Report</h3>
            <p>Takes 30 seconds. Snap a photo or describe what you lost or found.</p>
          </div>
          <div className="kh-step-box">
            <div className="kh-step-num">2</div>
            <h3>Match</h3>
            <p>KHOJ matches lost reports with found items across campus.</p>
          </div>
          <div className="kh-step-box">
            <div className="kh-step-num">3</div>
            <h3>Pick Up</h3>
            <p>Safely collect your item from the campus reception or library desk.</p>
          </div>
        </div>
      </section>

      {/* Campus Helpdesks */}
      <section className="kh-desks-section">
        <h2>Safe Campus Drop-Off Desks</h2>
        <p>Found something? Hand it over to any of these verified desks:</p>
        <div className="kh-desks-grid">
          <div className="kh-desk-card">
            <Building2 size={20} className="kh-desk-icon" />
            <div>
              <strong>Central Library Reception</strong>
              <span>Level 1 Front Desk (Books, Tech, Chargers)</span>
            </div>
          </div>
          <div className="kh-desk-card">
            <Building2 size={20} className="kh-desk-icon" />
            <div>
              <strong>Main Campus Reception</strong>
              <span>Admin Block Ground Floor</span>
            </div>
          </div>
          <div className="kh-desk-card">
            <Building2 size={20} className="kh-desk-icon" />
            <div>
              <strong>Student Plaza & Café</strong>
              <span>Food Court Helpdesk & Security Point</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
