"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Camera,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
  Lock,
  ArrowRight,
  Search,
} from "lucide-react";
import { usePortal } from "./PortalProvider";
import { Guard, Empty, ErrorBox } from "./Common";
import { categories, locations } from "@/lib/rvu/types";
import { featureApi } from "./IdentityPage";
import {
  FadeUp,
  StaggerList,
  StaggerChild,
  MotionModal,
  SuccessCheckmark,
} from "./MotionPrimitives";
import { TRANSITION_NORMAL } from "@/lib/motion";

export default function MyItems() {
  return (
    <Guard>
      <ProtectedItems />
    </Guard>
  );
}

function ProtectedItems() {
  const { data, refresh, toast } = usePortal();
  const [adding, setAdding] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [lostItemId, setLostItemId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageId, setImageId] = useState("");
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Form states
  const [itemName, setItemName] = useState("");
  const [selectedCat, setSelectedCat] = useState("Electronics");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [privateDetail, setPrivateDetail] = useState("");

  const quickCategories = [
    { label: "AirPods / Audio", cat: "Electronics", icon: "🎧" },
    { label: "Laptop / Tech", cat: "Electronics", icon: "💻" },
    { label: "Phone / Tablet", cat: "Electronics", icon: "📱" },
    { label: "Backpack / Bag", cat: "Bags", icon: "🎒" },
    { label: "Wallet / Cards", cat: "Wallets", icon: "👛" },
    { label: "Water Bottle", cat: "Bottles", icon: "🍶" },
    { label: "Keys / Keychain", cat: "Keys", icon: "🔑" },
    { label: "Other Belonging", cat: "Other", icon: "✨" },
  ];

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const r = await fetch("/api/rvu/upload", { method: "POST", body });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      setImageId(v.id);
      toast("Photo uploaded successfully.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await featureApi("items", {
        action: "register",
        imageId,
        name: itemName,
        category: selectedCat,
        brand,
        color,
        description: description || `${color} ${brand} ${itemName}`.trim(),
        privateDetail,
      });
      await refresh();
      setRegisteredSuccess(true);
      setTimeout(() => {
        setRegisteredSuccess(false);
        setAdding(false);
        resetForm();
        toast("Belonging protected. Details remain private.");
      }, 1400);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setRegisterStep(1);
    setItemName("");
    setSelectedCat("Electronics");
    setBrand("");
    setColor("");
    setDescription("");
    setPrivateDetail("");
    setImageId("");
    setError("");
  }

  return (
    <div className="rv-my-items-view" style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 60 }}>
      {/* Top Header */}
      <div className="rv-page-heading" style={{ marginBottom: 32 }}>
        <div>
          <span className="rv-eyebrow" style={{ color: "var(--rv-emerald)" }}>
            CAMPUS ASSET VAULT • PRE-LOSS PROTECTION
          </span>
          <h1 style={{ marginTop: 6 }}>My Items</h1>
          <p>Protect your everyday belongings. Keep unique identifying marks encrypted until needed.</p>
        </div>
        <button
          className="kh-primary-glow-btn"
          onClick={() => {
            resetForm();
            setAdding(true);
          }}
        >
          <Plus size={18} />
          Register Item
        </button>
      </div>

      <ErrorBox message={error} />

      {/* Registration Modal / Guided Flow */}
      <MotionModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        title={registeredSuccess ? undefined : `Protect a Belonging — Step 0${registerStep} of 03`}
      >
        {registeredSuccess ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <SuccessCheckmark size={64} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 750, marginBottom: 8 }}>
              Your item is protected.
            </h3>
            <p style={{ color: "var(--rv-muted)", fontSize: "0.95rem" }}>
              Encrypted in your personal vault. If it goes missing, recovery is 1 click away.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            {/* Step Indicators */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: "1px solid var(--rv-line)",
              }}
            >
              {[1, 2, 3].map((stepNum) => (
                <div
                  key={stepNum}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background:
                      registerStep >= stepNum ? "var(--rv-blue)" : "var(--rv-soft)",
                    transition: "all 0.25s ease",
                  }}
                />
              ))}
            </div>

            {/* Step 1: What are you protecting? */}
            {registerStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={TRANSITION_NORMAL}
              >
                <label className="rv-field" style={{ marginBottom: 16 }}>
                  ITEM NAME
                  <input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. AirPods Pro, Wildcraft Backpack, Dell XPS"
                    required
                    minLength={2}
                    maxLength={100}
                    autoFocus
                  />
                </label>

                <label className="rv-field" style={{ marginBottom: 12 }}>
                  CHOOSE CATEGORY
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {quickCategories.map((qc) => {
                    const active = selectedCat === qc.cat;
                    return (
                      <button
                        type="button"
                        key={qc.label}
                        onClick={() => setSelectedCat(qc.cat)}
                        style={{
                          background: active ? "var(--rv-blue-soft)" : "var(--rv-panel)",
                          border: active
                            ? "1.5px solid var(--rv-blue)"
                            : "1px solid var(--rv-line)",
                          color: active ? "var(--rv-blue)" : "var(--rv-text)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>{qc.icon}</span>
                        <span>{qc.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="rv-field-row" style={{ marginTop: 12 }}>
                  <label className="rv-field">
                    BRAND <span className="rv-optional">optional</span>
                    <input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Apple, Sony, Nike"
                      maxLength={80}
                    />
                  </label>
                  <label className="rv-field">
                    COLOUR <span className="rv-optional">optional</span>
                    <input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="e.g. Matte Black, Silver"
                      maxLength={60}
                    />
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                  <button
                    type="button"
                    className="kh-primary-glow-btn"
                    disabled={!itemName.trim()}
                    onClick={() => setRegisterStep(2)}
                  >
                    Continue to Photo <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Show us your item */}
            {registerStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={TRANSITION_NORMAL}
              >
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "1.1rem" }}>
                    Show us your item
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--rv-muted)" }}>
                    Add a clear photo to help verify appearance if it goes missing.
                  </p>
                </div>

                <div
                  style={{
                    border: "2px dashed var(--rv-line-hover)",
                    borderRadius: 14,
                    padding: "32px 20px",
                    textAlign: "center",
                    background: "var(--rv-soft)",
                    position: "relative",
                    marginBottom: 16,
                  }}
                >
                  {imageId ? (
                    <div>
                      <img
                        src={`/api/rvu/images/${imageId}`}
                        alt="Item preview"
                        style={{
                          maxHeight: 180,
                          borderRadius: 10,
                          border: "1px solid var(--rv-line)",
                          objectFit: "contain",
                          marginBottom: 12,
                        }}
                      />
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--rv-emerald)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={16} /> Photo added successfully
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="rv-text-button"
                          onClick={() => setImageId("")}
                        >
                          Change photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          background: "var(--rv-panel)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 12px",
                          color: "var(--rv-blue)",
                        }}
                      >
                        <Camera size={26} strokeWidth={1.75} />
                      </div>
                      <strong style={{ display: "block", marginBottom: 6, fontSize: "0.95rem" }}>
                        Drag & drop or browse photo
                      </strong>
                      <p style={{ color: "var(--rv-muted)", fontSize: "0.82rem", marginBottom: 14 }}>
                        JPEG, PNG, or WebP up to 5MB
                      </p>
                      <label
                        className="kh-secondary-outline-btn"
                        style={{ cursor: "pointer", display: "inline-flex" }}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={busy}
                          style={{ display: "none" }}
                          onChange={(e) => void upload(e.target.files?.[0])}
                        />
                        Select Photo
                      </label>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 24,
                  }}
                >
                  <button
                    type="button"
                    className="rv-button"
                    onClick={() => setRegisterStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="kh-primary-glow-btn"
                    onClick={() => setRegisterStep(3)}
                  >
                    Continue to Distinctive Mark <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: What makes YOUR item distinctive? */}
            {registerStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={TRANSITION_NORMAL}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Lock size={18} style={{ color: "var(--rv-blue)" }} />
                    <h4 style={{ margin: 0, fontSize: "1.1rem" }}>
                      What makes YOUR item distinctive?
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--rv-muted)" }}>
                    This is your <strong>blind ownership secret</strong>. It remains encrypted
                    and is never shown publicly.
                  </p>
                </div>

                <label className="rv-field" style={{ marginBottom: 14 }}>
                  PRIVATE IDENTIFYING DETAIL
                  <textarea
                    value={privateDetail}
                    onChange={(e) => setPrivateDetail(e.target.value)}
                    required
                    minLength={6}
                    maxLength={1000}
                    rows={3}
                    placeholder="e.g. Small scratch near left earbud hinge, Pikachu sticker under laptop cover, initials 'AK' carved inside."
                    autoFocus
                  />
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 14px",
                    background: "rgba(99, 102, 241, 0.08)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    color: "var(--rv-text)",
                    lineHeight: 1.45,
                    marginBottom: 20,
                  }}
                >
                  <ShieldCheck size={18} style={{ color: "var(--rv-blue)", flexShrink: 0, marginTop: 2 }} />
                  <span>
                    When someone finds a matching item, KHOJ challenges them to verify this secret detail before revealing any personal information.
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 24,
                  }}
                >
                  <button
                    type="button"
                    className="rv-button"
                    onClick={() => setRegisterStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="kh-primary-glow-btn"
                    disabled={busy || !privateDetail.trim()}
                  >
                    {busy ? "Protecting…" : "Protect This Item"}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        )}
      </MotionModal>

      {/* Items List */}
      {data.registeredItems.length ? (
        <StaggerList
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {data.registeredItems.map((item) => {
            const isLost = item.status === "lost";
            const isReturned = item.status === "returned";
            return (
              <StaggerChild key={item.id}>
                <article
                  style={{
                    background: "var(--rv-panel)",
                    border: "1px solid var(--rv-line)",
                    borderRadius: 14,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 10,
                        background: "var(--rv-soft)",
                        border: "1px solid var(--rv-line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {item.imageId ? (
                        <img
                          src={`/api/rvu/images/${item.imageId}`}
                          alt={item.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <Package size={22} style={{ color: "var(--rv-muted)" }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 750,
                          margin: "0 0 4px",
                          color: "var(--rv-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.name}
                      </h3>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--rv-muted)" }}>
                        {[item.category, item.brand, item.color].filter(Boolean).join(" · ")}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`kh-status-tag ${isLost ? "amber" : isReturned ? "indigo" : "emerald"}`}
                    >
                      {isLost ? "REPORTED LOST" : isReturned ? "RETURNED" : "SAFE"}
                    </span>
                  </div>

                  {/* Secret detail hint indicator */}
                  <div
                    style={{
                      background: "var(--rv-soft)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: "0.78rem",
                      color: "var(--rv-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <Lock size={13} style={{ color: "var(--rv-blue)", flexShrink: 0 }} />
                    <span>Secret mark stored for blind verification</span>
                  </div>

                  {/* Card Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "auto",
                      paddingTop: 12,
                      borderTop: "1px solid var(--rv-line)",
                    }}
                  >
                    {isLost ? (
                      <Link
                        className="rv-text-button"
                        href={`/items/${item.lostReportId}`}
                        style={{ fontWeight: 650, color: "var(--rv-blue)" }}
                      >
                        View active search <ArrowUpRight size={14} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="rv-text-button"
                        style={{ color: "var(--rv-amber)", fontWeight: 650 }}
                        onClick={() =>
                          setLostItemId(lostItemId === item.id ? "" : item.id)
                        }
                      >
                        {lostItemId === item.id ? "Cancel" : "Mark as lost"}
                      </button>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "var(--rv-ghost)" }}>
                      #{item.id.slice(-6)}
                    </span>
                  </div>

                  {/* Inline Mark as Lost Drawer */}
                  <AnimatePresence>
                    {lostItemId === item.id && !isLost && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={TRANSITION_NORMAL}
                        style={{
                          overflow: "hidden",
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: "1px dashed var(--rv-line-hover)",
                        }}
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setBusy(true);
                          setError("");
                          try {
                            await featureApi("items", {
                              action: "mark_lost",
                              itemId: item.id,
                              ...Object.fromEntries(new FormData(e.currentTarget)),
                            });
                            await refresh();
                            setLostItemId("");
                            toast("Lost report created. We are scanning for matches.");
                          } catch (err) {
                            setError((err as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: "var(--rv-amber)",
                            marginBottom: 8,
                          }}
                        >
                          REPORT MISSING ON CAMPUS
                        </span>
                        <div className="rv-field-row" style={{ gap: 8 }}>
                          <label className="rv-field">
                            WHERE WAS IT LAST SEEN?
                            <input
                              name="location"
                              list="protected-locations"
                              minLength={2}
                              maxLength={150}
                              required
                              placeholder="e.g. Central Library 2nd floor"
                            />
                            <datalist id="protected-locations">
                              {locations.map((l) => (
                                <option key={l} value={l} />
                              ))}
                            </datalist>
                          </label>
                          <label className="rv-field">
                            DATE LOST
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
                        </div>
                        <button
                          type="submit"
                          className="kh-primary-glow-btn"
                          style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                          disabled={busy}
                        >
                          {busy ? "Broadcasting…" : "Create Lost Report"}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </article>
              </StaggerChild>
            );
          })}
        </StaggerList>
      ) : !adding ? (
        <Empty
          title="No protected items registered yet."
          description="Register your phone, laptop, headphones, or backpack with an encrypted secret detail. If anything goes missing, recovery is 1 click away."
          label="+ Register your first item"
          onClick={() => {
            resetForm();
            setAdding(true);
          }}
        />
      ) : null}

      {/* Security note footer */}
      <div className="kh-privacy-line" style={{ marginTop: 40 }}>
        <ShieldCheck size={18} style={{ color: "var(--rv-emerald)" }} />
        <p>
          Safe items are strictly private to your verified account. Link your campus identity card in{" "}
          <Link href="/profile">Profile</Link>.
        </p>
      </div>
    </div>
  );
}
