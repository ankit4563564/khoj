"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  UploadCloud,
  LockKeyhole,
  Check,
  Sparkles,
  X,
  Camera,
  MapPin,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { categories, departments, locations } from "@/lib/rvu/types";
import { usePortal } from "./PortalProvider";
import { ErrorBox, Guard } from "./Common";
import { featureApi } from "./IdentityPage";
import { TRANSITION_NORMAL } from "@/lib/motion";

export default function ReportForm({ kind }: { kind: "lost" | "found" }) {
  if (kind === "found") return <Form kind={kind} />;
  return (
    <Guard>
      <Form kind={kind} />
    </Guard>
  );
}

function Form({ kind }: { kind: "lost" | "found" }) {
  const { data, act, toast, refresh } = usePortal(),
    router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [analysing, setAnalysing] = useState(false),
    [imageId, setImageId] = useState(""),
    [title, setTitle] = useState(""),
    [category, setCategory] = useState(""),
    [color, setColor] = useState(""),
    [brand, setBrand] = useState(""),
    [description, setDescription] = useState(""),
    [locationVal, setLocationVal] = useState("");

  const quickSpots = [
    "Central Library",
    "Tech Block 2nd Floor",
    "Student Cafeteria",
    "Campus Reception Desk",
    "Architecture Quad",
    "Sports Complex",
  ];

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/rvu/upload", {
        method: "POST",
        body: form,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setImageId(result.id);
      toast("Photo uploaded. Auto-analysing item details…");
      // Auto-trigger analysis immediately
      await analyse(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function analyse(targetImageId?: string) {
    const idToUse = targetImageId || imageId;
    if (!idToUse) return;
    setAnalysing(true);
    setError("");
    try {
      const res = await fetch("/api/rvu/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: idToUse }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error);
      if (r.title) setTitle(r.title);
      if (r.category) setCategory(r.category);
      if (r.color) setColor(r.color);
      if (r.brand) setBrand(r.brand);
      if (r.description) setDescription(r.description);
      toast("Visual attributes auto-filled from photo.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalysing(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const valuesToSend = {
        ...values,
        location: locationVal || (values.location as string),
        kind,
        imageId,
        title,
        category,
        color,
        brand,
        description,
      };
      const result =
        kind === "found"
          ? await featureApi("public", {
              action: "found_report",
              ...valuesToSend,
            })
          : await act("create_report", valuesToSend);
      if (kind === "found") await refresh();
      toast(
        kind === "found"
          ? "Found report submitted! Thank you for looking out."
          : "Lost report submitted. Looking for potential matches."
      );
      router.push(
        kind === "found" ? `/finder/cases/${result.id}` : `/items/${result.id}`
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rv-form-page" style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 60 }}>
      {kind === "found" && (
        <div className="kh-journey-pill" style={{ marginBottom: 14 }}>
          <span className="kh-pulse-dot" />
          <span>NO ACCOUNT NEEDED • REPORT IN 30 SECONDS</span>
        </div>
      )}

      <Link
        href={kind === "found" && !data.user ? "/" : "/board"}
        className="rv-back"
      >
        <ArrowLeft size={16} />
        {kind === "found" && !data.user ? "Back to home" : "Back to campus board"}
      </Link>

      <div className="rv-page-heading" style={{ marginBottom: 28 }}>
        <div>
          <span className="rv-eyebrow" style={{ color: kind === "found" ? "var(--rv-emerald)" : "var(--rv-blue)" }}>
            {kind === "lost"
              ? "CAMPUS SEARCH PROTOCOL"
              : "COMMUNITY RETURN FLOW"}
          </span>
          <h1 style={{ marginTop: 4 }}>
            {kind === "lost" ? "Report a lost item." : "Found something?"}
          </h1>
          <p>
            {kind === "lost"
              ? "Describe what’s missing. We’ll match it against found reports across campus."
              : "Help us get it back to its owner. Quick photo and location is all it takes."}
          </p>
        </div>
        <span className={`rv-form-kind ${kind}`}>
          {kind === "lost" ? "LOST" : "FOUND"}
        </span>
      </div>

      <form onSubmit={submit} className="rv-report-layout">
        <div>
          {/* Section 01: Photo & Core Item */}
          <section className="rv-panel" style={{ borderRadius: 14, marginBottom: 20 }}>
            <div className="rv-form-section">
              <span>01</span>
              <div>
                <h2>The item</h2>
                <p>Add a photo to enable instant AI recognition.</p>
              </div>
            </div>

            {/* Upload Zone */}
            <label
              className="rv-upload"
              style={{
                border: "2px dashed var(--rv-line-hover)",
                borderRadius: 12,
                background: "var(--rv-soft)",
                padding: "26px 20px",
                position: "relative",
              }}
            >
              {imageId ? (
                <div style={{ textAlign: "center" }}>
                  <img
                    src={`/api/rvu/images/${imageId}`}
                    alt="Uploaded preview"
                    style={{
                      maxHeight: 200,
                      borderRadius: 8,
                      border: "1px solid var(--rv-line)",
                      objectFit: "contain",
                      marginBottom: 10,
                    }}
                  />
                  <span style={{ display: "block", color: "var(--rv-muted)", fontSize: "0.82rem" }}>
                    Click to replace photo
                  </span>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "var(--rv-panel)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 10px",
                      color: "var(--rv-blue)",
                    }}
                  >
                    <UploadCloud size={26} strokeWidth={1.5} />
                  </div>
                  <strong style={{ display: "block", fontSize: "0.95rem", marginBottom: 4 }}>
                    {uploading ? "Uploading photo…" : "Upload a photo of the item"}
                  </strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--rv-muted)" }}>
                    Click to browse or take photo • JPG, PNG, WebP up to 5 MB
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Item photo"
                disabled={uploading || analysing}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>

            {/* AI Auto-fill trigger */}
            {imageId && (
              <div
                className="rv-upload-actions"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  className="rv-text-button"
                  onClick={() => setImageId("")}
                  style={{ color: "var(--rv-muted)" }}
                >
                  <X size={14} /> Remove photo
                </button>
                {data.config.vision && (
                  <button
                    type="button"
                    className="kh-primary-glow-btn"
                    style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    disabled={analysing}
                    onClick={() => void analyse()}
                  >
                    <Sparkles size={15} />
                    {analysing ? "Analyzing photo…" : "Fill details from photo"}
                  </button>
                )}
              </div>
            )}

            <label className="rv-field" style={{ marginTop: 18 }}>
              ITEM NAME
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Black Sony WH-1000XM4 headphones"
                required
                minLength={3}
                maxLength={100}
              />
            </label>

            <div className="rv-field-row">
              <label className="rv-field">
                CATEGORY
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="rv-field">
                COLOUR <span className="rv-optional">optional</span>
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Matte Black"
                  maxLength={60}
                />
              </label>
            </div>

            <label className="rv-field">
              BRAND <span className="rv-optional">optional</span>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Sony, Apple, Wildcraft"
                maxLength={80}
              />
            </label>

            <label className="rv-field">
              PUBLIC DESCRIPTION
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe visible features. Keep private marks for the next section."
                required
                minLength={10}
                maxLength={2000}
                rows={3}
              />
            </label>
          </section>

          {/* Section 02: Where & When */}
          <section className="rv-panel" style={{ borderRadius: 14, marginBottom: 20 }}>
            <div className="rv-form-section">
              <span>02</span>
              <div>
                <h2>Where & when</h2>
                <p>
                  {kind === "lost"
                    ? "Where did you last have it?"
                    : "Where was the item spotted?"}
                </p>
              </div>
            </div>

            {/* Quick Location Chips */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--rv-ghost)", textTransform: "uppercase" }}>
                COMMON CAMPUS LOCATIONS
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {quickSpots.map((qs) => (
                  <button
                    type="button"
                    key={qs}
                    onClick={() => setLocationVal(qs)}
                    style={{
                      background: locationVal === qs ? "var(--rv-blue-soft)" : "var(--rv-soft)",
                      border: locationVal === qs ? "1px solid var(--rv-blue)" : "1px solid var(--rv-line)",
                      color: locationVal === qs ? "var(--rv-blue)" : "var(--rv-text)",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {qs}
                  </button>
                ))}
              </div>
            </div>

            <label className="rv-field">
              LOCATION DETAILS
              <input
                name="location"
                value={locationVal}
                onChange={(e) => setLocationVal(e.target.value)}
                list="rvu-locations"
                placeholder="e.g. Central Library Floor 3, Silent Study Desk"
                required
                minLength={2}
                maxLength={150}
              />
              <datalist id="rvu-locations">
                {locations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>

            <div className="rv-field-row">
              <label className="rv-field">
                DATE {kind.toUpperCase()}
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={new Date().toLocaleDateString("en-CA", {
                    timeZone: "Asia/Kolkata",
                  })}
                  max={new Date().toLocaleDateString("en-CA", {
                    timeZone: "Asia/Kolkata",
                  })}
                />
              </label>
              <label className="rv-field">
                CAMPUS SCHOOL / DEPT
                <select
                  name="department"
                  required
                  defaultValue={data.user?.department || "Other"}
                >
                  {departments.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Section 03: Private detail */}
          <section className="rv-panel" style={{ borderRadius: 14, marginBottom: 24 }}>
            <div className="rv-form-section">
              <span>03</span>
              <div>
                <h2>Private identifying detail</h2>
                <p>Used strictly for blind verification. Never shown publicly.</p>
              </div>
              <LockKeyhole size={20} style={{ color: "var(--rv-blue)" }} />
            </div>

            <label className="rv-field">
              SECRET IDENTIFIER <span className="rv-optional">optional</span>
              <textarea
                name="privateDetail"
                placeholder={
                  kind === "lost"
                    ? "A unique scratch, sticker under case, initials, or what’s inside."
                    : "A specific mark the owner should know to claim this item."
                }
                rows={2}
                maxLength={1000}
              />
            </label>
          </section>

          <ErrorBox message={error} />

          {/* Action Row */}
          <div className="rv-form-submit" style={{ display: "flex", gap: 14 }}>
            <Link
              href={kind === "found" && !data.user ? "/" : "/board"}
              className="rv-button"
            >
              Cancel
            </Link>
            <button
              className="kh-primary-glow-btn"
              disabled={busy || uploading || analysing}
              style={{ flex: 1, justifyContent: "center" }}
            >
              {busy
                ? "Submitting securely…"
                : kind === "found"
                ? "Submit Found Item"
                : "Submit Lost Report"}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="rv-form-aside">
          <span className="rv-eyebrow" style={{ color: "var(--rv-emerald)" }}>
            CAMPUS RECOVERY PROTOCOL
          </span>
          <h3 style={{ fontSize: "1.15rem", marginTop: 4, marginBottom: 16 }}>
            Safe by design.
          </h3>
          {[
            "Clear photo gives 3x faster AI match.",
            "Personal names or phone numbers stay masked.",
            "Blind Verification prevents false claims.",
            "Safe physical handovers at Campus Reception.",
          ].map((t) => (
            <p key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
              <Check size={16} style={{ color: "var(--rv-emerald)", flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: "0.88rem", color: "var(--rv-text)" }}>{t}</span>
            </p>
          ))}

          {kind === "found" && (
            <div
              style={{
                marginTop: 20,
                padding: "16px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.22)",
                borderRadius: 10,
              }}
            >
              <CheckCircle2 size={20} style={{ color: "var(--rv-emerald)", marginBottom: 6 }} />
              <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--rv-text)" }}>
                Zero Account Needed
              </strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--rv-muted)", lineHeight: 1.45 }}>
                After submitting, you&apos;ll get a private browser receipt link. You can track handover without ever creating an account.
              </p>
            </div>
          )}
        </aside>
      </form>
    </div>
  );
}
