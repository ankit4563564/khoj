"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Compass,
  Lock,
  QrCode,
  Radio,
  Check,
  ChevronRight,
  Sparkle,
  UploadCloud,
  FileCheck,
  Users,
} from "lucide-react";
import { usePortal } from "./PortalProvider";
import {
  TRANSITION_PAGE,
  TRANSITION_NORMAL,
  TRANSITION_MICRO,
  fadeUpVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/motion";

export default function About() {
  const { data } = usePortal();
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Hero interactive object state: LOST -> FOUND -> MATCHED -> RETURNED
  const [heroStage, setHeroStage] = useState<"lost" | "found" | "matched" | "returned">("lost");

  // Section 2: Active hotspot
  const [activeSpot, setActiveSpot] = useState(0);

  // Auto-cycle hero stages subtly
  useEffect(() => {
    const stages: Array<"lost" | "found" | "matched" | "returned"> = ["lost", "found", "matched", "returned"];
    const interval = setInterval(() => {
      setHeroStage((curr) => {
        const nextIdx = (stages.indexOf(curr) + 1) % stages.length;
        return stages[nextIdx];
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const reports = data?.reports || [];
  const filtered = reports
    .filter((r) => {
      const matchesQuery =
        !query ||
        `${r.title} ${r.description} ${r.location} ${r.category}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCat = selectedCat === "all" || r.category === selectedCat;
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

  const hotspots = [
    {
      name: "Central Library Floor 2",
      hint: "Study carrels, quiet cubicles & charger ports",
      seen: "AirPods Pro & Apple Pencil left behind",
    },
    {
      name: "Cafeteria Ground & Coffee Bar",
      hint: "High-traffic seating, lunch benches & food court",
      seen: "Matte black Hydro Flask & ID badge",
    },
    {
      name: "Tech Block A Labs",
      hint: "Coding labs, workstation tables & hardware benches",
      seen: "67W MacBook GaN charger & USB-C hub",
    },
    {
      name: "Hostel Quad Common Lounge",
      hint: "Couches, pool table & group discussion areas",
      seen: "Bellroy charcoal tech backpack",
    },
    {
      name: "Design Studio 2",
      hint: "Drafting desks, model-making benches & storage",
      seen: "Student portfolio folder & ID card",
    },
  ];

  const heroStageDetails = {
    lost: {
      label: "LAST SEEN",
      color: "amber",
      text: "AirPods Pro & RVU Student ID forgotten on library desk 14",
      highlightPin: "Library Floor 2",
    },
    found: {
      label: "FOUND",
      color: "blue",
      text: "Discovered by a fellow student and photographed in 10 seconds",
      highlightPin: "Cafeteria Bench",
    },
    matched: {
      label: "POTENTIAL MATCH",
      color: "indigo",
      text: "Private secret detail verified without exposing phone numbers",
      highlightPin: "KHOJ Match Engine",
    },
    returned: {
      label: "RETURNED",
      color: "emerald",
      text: "Safely collected at Campus Reception Desk. Owner smiles.",
      highlightPin: "Reception Desk",
    },
  };

  return (
    <div className="ru-page-wrap">
      {/* ========================================================
          1. HERO — THE WOW MOMENT
          Large typography: RU LOST IN RVU?
          Tagline: Your stuff doesn't have to be.
          Dual CTAs + Interactive Hero Campus Object flatlay
          ======================================================== */}
      <motion.section
        className="ru-hero"
        initial="hidden"
        animate="visible"
        variants={staggerContainerVariants}
      >
        <motion.div variants={staggerItemVariants}>
          <span className="ru-section-eyebrow">
            <Radio size={12} className="kh-sparkle-icon" />
            RV University • Campus Lost & Found
          </span>
        </motion.div>

        <motion.h1 className="ru-hero-title" variants={staggerItemVariants}>
          RU LOST
          <span>IN RVU?</span>
        </motion.h1>

        <motion.p className="ru-hero-tagline" variants={staggerItemVariants}>
          Your stuff doesn’t have to be.
        </motion.p>

        <motion.p className="ru-hero-copy" variants={staggerItemVariants}>
          Lost your AirPods, bottle, backpack or ID around campus?
          <br />
          Don&apos;t panic. Someone might have found it.
        </motion.p>

        {/* Dual High-Impact CTAs */}
        <motion.div className="ru-hero-cta-group" variants={staggerItemVariants}>
          <Link href="/report/lost" className="ru-btn-lost">
            <Search size={20} strokeWidth={2.4} />
            <span>I Lost Something</span>
          </Link>

          <Link href="/report/found" className="ru-btn-found">
            <Camera size={20} strokeWidth={2} />
            <span>I Found Something</span>
            <span className="ru-btn-badge">10s • No Login</span>
          </Link>
        </motion.div>

        {/* Interactive Hero Campus Object Composition */}
        <motion.div
          className="ru-hero-showcase"
          variants={staggerItemVariants}
        >
          <div className="ru-showcase-image-container">
            <img
              src="/images/hero_campus_objects.jpg"
              alt="RVU student campus belongings - AirPods, ID card, bottle, charger"
              className="ru-showcase-img"
            />
            <div className="ru-showcase-overlay" />

            {/* Floating Object Status Pins with Framer Motion */}
            <AnimatePresence mode="wait">
              {heroStage === "lost" && (
                <motion.div
                  key="pin-lost"
                  className="ru-object-pin"
                  style={{ top: "28%", left: "32%" }}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={TRANSITION_NORMAL}
                >
                  <span className="ru-pin-dot" />
                  <span>LAST SEEN • Central Library</span>
                </motion.div>
              )}

              {heroStage === "found" && (
                <motion.div
                  key="pin-found"
                  className="ru-object-pin"
                  style={{ top: "34%", right: "26%" }}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={TRANSITION_NORMAL}
                >
                  <span className="ru-pin-dot emerald" />
                  <span>FOUND • By Student Maya</span>
                </motion.div>
              )}

              {heroStage === "matched" && (
                <motion.div
                  key="pin-matched"
                  className="ru-object-pin"
                  style={{ bottom: "28%", left: "42%" }}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={TRANSITION_NORMAL}
                >
                  <span className="ru-pin-dot" />
                  <span>POTENTIAL MATCH • Clue Verified</span>
                </motion.div>
              )}

              {heroStage === "returned" && (
                <motion.div
                  key="pin-returned"
                  className="ru-object-pin"
                  style={{ bottom: "25%", right: "32%" }}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={TRANSITION_NORMAL}
                >
                  <span className="ru-pin-dot emerald" />
                  <span>RETURNED • Reunited Successfully</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Progression Bar (LOST -> FOUND -> MATCHED -> RETURNED) */}
          <div className="ru-showcase-toolbar">
            <div className="ru-flow-pills">
              <button
                type="button"
                onClick={() => setHeroStage("lost")}
                className={`ru-flow-pill ${heroStage === "lost" ? "active" : ""}`}
              >
                <span>LOST</span>
              </button>
              <span className="ru-flow-arrow">→</span>

              <button
                type="button"
                onClick={() => setHeroStage("found")}
                className={`ru-flow-pill ${heroStage === "found" ? "active" : ""}`}
              >
                <span>FOUND</span>
              </button>
              <span className="ru-flow-arrow">→</span>

              <button
                type="button"
                onClick={() => setHeroStage("matched")}
                className={`ru-flow-pill ${heroStage === "matched" ? "active" : ""}`}
              >
                <span>MATCHED</span>
              </button>
              <span className="ru-flow-arrow">→</span>

              <button
                type="button"
                onClick={() => setHeroStage("returned")}
                className={`ru-flow-pill ${heroStage === "returned" ? "active emerald" : ""}`}
              >
                <span>RETURNED</span>
              </button>
            </div>

            <div className="ru-showcase-active-note">
              <strong>{heroStageDetails[heroStage].label}:</strong>
              {heroStageDetails[heroStage].text}
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ========================================================
          2. THE PROBLEM — CAMPUS MENTAL MAP
          LOST SOMETHING?
          You remember where you last saw it. But then...
          Library? Cafeteria? Classroom? Hostel? Lab?
          ======================================================== */}
      <motion.section
        className="ru-problem-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainerVariants}
      >
        <div>
          <span className="ru-section-eyebrow amber">
            <Compass size={12} />
            The Campus Dilemma
          </span>
          <h2 className="ru-section-heading">
            LOST SOMETHING?
            <br />
            You remember where you last saw it.
          </h2>
          <p className="ru-section-sub">
            Library? Cafeteria? Classroom? Hostel? Lab?
            <br />
            Instead of frantic WhatsApp group spam, KHOJ pinpoints items across campus.
          </p>
        </div>

        <div className="ru-problem-grid">
          {/* Visual with real macro AirPods desk photo */}
          <div className="ru-problem-visual">
            <img
              src="/images/lost_airpods_desk.jpg"
              alt="AirPods Pro resting on library study desk"
              className="ru-problem-img"
            />
            <div className="ru-problem-tag">
              <strong>Last seen in Library</strong>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>
                Reported missing 20m ago • Finder alert dispatched
              </div>
            </div>
          </div>

          {/* Interactive Campus Hotspot Breakdown */}
          <div className="ru-hotspots-list">
            {hotspots.map((spot, idx) => (
              <div
                key={spot.name}
                className={`ru-hotspot-item ${activeSpot === idx ? "active" : ""}`}
                onClick={() => setActiveSpot(idx)}
              >
                <div className="ru-hotspot-icon">
                  <MapPin size={18} />
                </div>
                <div className="ru-hotspot-content">
                  <h4>{spot.name}</h4>
                  <p>{spot.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ========================================================
          3. HOW IT WORKS — 4 CLEAN EDITORIAL STEPS
          01 REGISTER -> 02 REPORT -> 03 MATCH -> 04 RETURN
          ======================================================== */}
      <motion.section
        className="ru-how-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainerVariants}
      >
        <div>
          <span className="ru-section-eyebrow">
            <FileCheck size={12} />
            Simple 4-Step Recovery
          </span>
          <h2 className="ru-section-heading">How KHOJ Works</h2>
          <p className="ru-section-sub">
            Built for RVU students. Fast, private, and zero university bureaucracy.
          </p>
        </div>

        <div className="ru-how-grid">
          {/* 01 REGISTER */}
          <motion.div className="ru-how-card" variants={staggerItemVariants}>
            <div className="ru-how-top">
              <span className="ru-how-num">01</span>
              <div className="ru-how-icon-wrap">
                <ShieldCheck size={22} />
              </div>
            </div>
            <div>
              <h3 className="ru-how-title">REGISTER</h3>
              <p className="ru-how-desc">
                Protect your important belongings. Register a photo and a secret detail only you know.
              </p>
            </div>
          </motion.div>

          {/* 02 REPORT */}
          <motion.div className="ru-how-card" variants={staggerItemVariants}>
            <div className="ru-how-top">
              <span className="ru-how-num">02</span>
              <div className="ru-how-icon-wrap">
                <Camera size={22} />
              </div>
            </div>
            <div>
              <h3 className="ru-how-title">REPORT</h3>
              <p className="ru-how-desc">
                Someone finds an item and uploads a photo in 10 seconds. No login or account required.
              </p>
            </div>
          </motion.div>

          {/* 03 MATCH */}
          <motion.div className="ru-how-card" variants={staggerItemVariants}>
            <div className="ru-how-top">
              <span className="ru-how-num">03</span>
              <div className="ru-how-icon-wrap">
                <Sparkles size={22} />
              </div>
            </div>
            <div>
              <h3 className="ru-how-title">MATCH</h3>
              <p className="ru-how-desc">
                KHOJ looks for a possible match silently. Your contact details remain strictly private.
              </p>
            </div>
          </motion.div>

          {/* 04 RETURN */}
          <motion.div className="ru-how-card" variants={staggerItemVariants}>
            <div className="ru-how-top">
              <span className="ru-how-num">04</span>
              <div className="ru-how-icon-wrap">
                <CheckCircle2 size={22} />
              </div>
            </div>
            <div>
              <h3 className="ru-how-title">RETURN</h3>
              <p className="ru-how-desc">
                Ownership is verified via your secret clue, and the item comes safely back to you.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ========================================================
          4. THE MAGIC MOMENT — POTENTIAL MATCH INTERACTION
          FOUND ITEM AirPods <-> Connection Line <-> POTENTIAL MATCH "My AirPods"
          Blind verification prompt: "Tell us what makes your item yours"
          NO AI scores. NO technical jargon.
          ======================================================== */}
      <motion.section
        className="ru-magic-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainerVariants}
      >
        <div>
          <span className="ru-section-eyebrow">
            <Lock size={12} />
            The Magic Moment
          </span>
          <h2 className="ru-section-heading">Matched Without the Awkwardness.</h2>
          <p className="ru-section-sub">
            KHOJ connects found items with rightful owners through blind physical clues,
            protecting both parties without broadcasting personal details.
          </p>
        </div>

        <div className="ru-magic-box">
          <div className="ru-magic-comparison">
            {/* Left: Found Item */}
            <div className="ru-magic-card">
              <div className="ru-magic-card-header">
                <span className="ru-magic-badge found">FOUND ITEM</span>
                <span style={{ fontSize: "0.76rem", color: "#64748b" }}>20 mins ago</span>
              </div>
              <h4 className="ru-magic-item-title">AirPods Pro (2nd Gen)</h4>
              <div className="ru-magic-detail">
                <MapPin size={14} />
                <span>Found at Central Library Desk #14</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Finder: Fellow RVU Student
              </div>
            </div>

            {/* Center: Animated Connection Node */}
            <div className="ru-magic-beam-col">
              <motion.div
                className="ru-magic-node"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              >
                <Sparkles size={24} />
              </motion.div>
              <span className="ru-magic-beam-text">POTENTIAL MATCH</span>
            </div>

            {/* Right: Potential Registered Match */}
            <div className="ru-magic-card">
              <div className="ru-magic-card-header">
                <span className="ru-magic-badge mine">MY REGISTERED ITEM</span>
                <span style={{ fontSize: "0.76rem", color: "#10b981" }}>Protected</span>
              </div>
              <h4 className="ru-magic-item-title">My AirPods Pro</h4>
              <div className="ru-magic-detail">
                <Lock size={14} />
                <span>Secret clue encrypted on file</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Status: Awaiting clue verification
              </div>
            </div>
          </div>

          {/* Blind Verification Prompt Banner */}
          <div className="ru-blind-prompt-card">
            <div className="ru-blind-prompt-text">
              <strong>Before we reveal the details...</strong>
              <span>Tell us what makes your item yours (e.g. sticker on lid, engraved initials, tiny scratch).</span>
            </div>
            <Link href="/board" className="ru-btn-lost" style={{ padding: "10px 18px", fontSize: "0.88rem" }}>
              Verify My Claim →
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ========================================================
          5. FOUND SOMETHING?
          "You're already doing the right thing."
          Large visual: Student photographing found backpack in campus.
          CTA: [ Upload Found Item ]
          Photo -> Location -> Submit
          ======================================================== */}
      <motion.section
        className="ru-found-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUpVariants}
      >
        <div className="ru-found-banner">
          <div className="ru-found-img-col">
            <img
              src="/images/found_campus_backpack.jpg"
              alt="Student taking a photo of a backpack found on campus bench"
              className="ru-found-img"
            />
          </div>

          <div className="ru-found-content-col">
            <span className="ru-section-eyebrow emerald">
              <Sparkle size={12} />
              Zero-Friction Finder Flow
            </span>
            <h2 className="ru-section-heading" style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)" }}>
              FOUND SOMETHING?
              <br />
              You’re already doing the right thing.
            </h2>
            <p className="ru-section-sub">
              No account creation. No password hassle. Help a stressed classmate recover their essential belongings in 10 seconds.
            </p>

            <div className="ru-quick-flow-chips">
              <span className="ru-quick-flow-chip">
                <Camera size={14} /> 1. Quick Photo
              </span>
              <span style={{ color: "#475569" }}>→</span>
              <span className="ru-quick-flow-chip">
                <MapPin size={14} /> 2. Tap Location
              </span>
              <span style={{ color: "#475569" }}>→</span>
              <span className="ru-quick-flow-chip">
                <Check size={14} /> 3. Submit
              </span>
            </div>

            <div>
              <Link href="/report/found" className="ru-btn-found" style={{ display: "inline-flex" }}>
                <UploadCloud size={20} />
                <span>Upload Found Item</span>
                <span className="ru-btn-badge">Takes 10s</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ========================================================
          6. RECOVERY CELEBRATION
          BACK TO ITS OWNER.
          Student A -> recovered item -> Student B
          "One lost thing. One helpful person. One successful return."
          ✓ Item returned (Framer Motion checkmark)
          ======================================================== */}
      <motion.section
        className="ru-recovery-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainerVariants}
      >
        <div className="ru-recovery-grid">
          <div className="ru-recovery-content">
            <span className="ru-section-eyebrow emerald">
              <CheckCircle2 size={12} />
              Reunion Moment
            </span>
            <h2 className="ru-section-heading">
              BACK TO ITS OWNER.
            </h2>
            <p className="ru-section-sub" style={{ fontSize: "1.1rem" }}>
              One lost thing.
              <br />
              One helpful person.
              <br />
              <strong>One successful return.</strong>
            </p>

            <div className="ru-recovery-stats">
              <div className="ru-recovery-stat-box">
                <strong>94%</strong>
                <span>ID & Tech Return Rate</span>
              </div>
              <div className="ru-recovery-stat-box">
                <strong>&lt; 3 hrs</strong>
                <span>Average Campus Reunion</span>
              </div>
            </div>
          </div>

          <div className="ru-recovery-visual-wrap">
            <img
              src="/images/campus_handoff_return.jpg"
              alt="Students smiling and returning lost items in university hallway"
              className="ru-recovery-img"
            />
            <div className="ru-recovery-badge">
              <Check size={16} strokeWidth={3} />
              <span>Item Returned Successfully</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ========================================================
          7. CAMPUS QR — YOUR RVU ID. YOUR KHOJ IDENTITY.
          Realistic college ID mockup with safe QR flow
          Sensitive info hidden, no public phone or USN exposure
          ======================================================== */}
      <motion.section
        className="ru-qr-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUpVariants}
      >
        <div className="ru-qr-box">
          <div>
            <span className="ru-section-eyebrow">
              <QrCode size={12} />
              Campus Identity Integration
            </span>
            <h2 className="ru-section-heading">
              YOUR RVU ID.
              <br />
              YOUR KHOJ IDENTITY.
            </h2>
            <p className="ru-section-sub">
              Your official RV University student ID card connects directly to KHOJ.
              When anyone scans your lost badge, an instant alert is sent directly to your
              university inbox without exposing your phone number or USN.
            </p>
            <div style={{ marginTop: 24 }}>
              <Link href="/profile" className="ru-btn-found" style={{ display: "inline-flex" }}>
                <span>Connect My RVU ID</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Realistic Student ID Mockup */}
          <div className="ru-id-mockup-card">
            <div className="ru-id-mockup-header">
              <div className="ru-id-crest">
                <Building2 size={20} color="#6366f1" />
                <strong>RV UNIVERSITY</strong>
              </div>
              <span className="ru-id-qr-badge">KHOJ ENABLED</span>
            </div>

            <div className="ru-id-body">
              <div className="ru-id-photo-frame">
                <Users size={28} />
              </div>
              <div className="ru-id-data">
                <h4>Maya Sharma</h4>
                <p>School of Design & Innovation</p>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <QrCode size={18} color="#818cf8" />
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Scan with any phone camera
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ========================================================
          8. LIVE RECENT CAMPUS ITEMS (PRESERVED CORE FUNCTIONALITY)
          Real-time search bar & category pills
          Clicking opens /items/[id]
          ======================================================== */}
      <section className="kh-search-section">
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: 6 }}>
            Browse Active Campus Items
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Search live reports across the university to see if your lost item was found.
          </p>
        </div>

        <div className="kh-search-box">
          <Search size={18} className="kh-search-icon" />
          <input
            type="text"
            placeholder="Search items (e.g. keys, ID card, AirPods, Hydro Flask)..."
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

        {/* Category Pills */}
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

        {/* Items Grid */}
        {filtered.length > 0 ? (
          <div className="kh-items-grid" style={{ marginTop: 24 }}>
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
          <div className="kh-empty-card" style={{ marginTop: 24 }}>
            <Package size={36} strokeWidth={1.4} />
            <h3>No items found</h3>
            <p>
              {query
                ? `No items match "${query}". Try searching for something else.`
                : "No active reports matching this category."}
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

      {/* ========================================================
          9. FINAL CTA — RU STILL LOOKING?
          "RU STILL LOOKING? Maybe someone already found it."
          [ FIND MY ITEM ] [ HELP RETURN IT ]
          KHOJ @ RVU — "Your stuff doesn’t have to stay lost."
          ======================================================== */}
      <motion.section
        className="ru-final-cta"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={fadeUpVariants}
      >
        <span className="ru-section-eyebrow">
          <Sparkles size={12} />
          Campus Recovery Network
        </span>

        <h2 className="ru-final-headline">
          RU STILL LOOKING?
        </h2>

        <p className="ru-final-sub">
          Maybe someone already found it. Check the campus board or help return an item.
        </p>

        <div className="ru-hero-cta-group">
          <Link href="/board" className="ru-btn-lost">
            <Search size={18} />
            <span>FIND MY ITEM</span>
          </Link>

          <Link href="/report/found" className="ru-btn-found">
            <Camera size={18} />
            <span>HELP RETURN IT</span>
          </Link>
        </div>

        <div className="ru-final-brand-mark">
          KHOJ @ RVU • Your stuff doesn’t have to stay lost.
        </div>
      </motion.section>
    </div>
  );
}
