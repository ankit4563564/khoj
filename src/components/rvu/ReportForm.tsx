"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  UploadCloud,
  Check,
  Sparkles,
  X,
  Camera,
  MapPin,
  ShieldCheck,
  Package,
} from "lucide-react";
import { categories, departments, locations } from "@/lib/rvu/types";
import { usePortal } from "./PortalProvider";
import { ErrorBox, Guard } from "./Common";
import { featureApi } from "./IdentityPage";

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
    [category, setCategory] = useState("Electronics"),
    [color, setColor] = useState(""),
    [brand, setBrand] = useState(""),
    [description, setDescription] = useState(""),
    [locationVal, setLocationVal] = useState("Central Library");

  const quickSpots = [
    "Central Library",
    "Student Cafeteria",
    "Tech Block 2nd Floor",
    "Campus Reception Desk",
    "Sports Ground",
    "Audi / Quad",
  ];

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 8 * 1024 * 1024) {
      setError("Please choose a photo smaller than 8 MB.");
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
      toast("Photo uploaded!");
      // Auto-analyze with AI if enabled
      if (data?.config?.vision) {
        await analyse(result.id);
      }
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
    try {
      const res = await fetch("/api/rvu/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: idToUse }),
      });
      const r = await res.json();
      if (res.ok) {
        if (r.title && !title) setTitle(r.title);
        if (r.category) setCategory(r.category);
        if (r.color && !color) setColor(r.color);
        if (r.brand && !brand) setBrand(r.brand);
        if (r.description && !description) setDescription(r.description);
        toast("Filled details automatically from your photo!");
      }
    } catch {
      // Non-blocking analysis failure
    } finally {
      setAnalysing(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter the name of the item.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const valuesToSend = {
        ...values,
        location: locationVal || (values.location as string) || "RVU Campus",
        kind,
        imageId,
        title: title.trim(),
        category: category || "Other",
        color: color.trim(),
        brand: brand.trim(),
        description: description.trim() || `${title} (${category})`,
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
          ? "Found item reported! Thank you for helping."
          : "Lost report submitted! We'll alert you if a match is found."
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
    <div className="kh-form-container">
      {/* Back button */}
      <Link href="/" className="kh-back-nav">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      {/* Header */}
      <div className="kh-form-header">
        <span className={`kh-form-pill ${kind}`}>
          {kind === "lost" ? "🔴 Report Lost Item" : "🟢 Report Found Item"}
        </span>
        <h1>{kind === "lost" ? "What did you lose?" : "What did you find?"}</h1>
        <p>
          {kind === "lost"
            ? "Fill in a few quick details so we can alert you when it's found."
            : "No account required. Submit in 30 seconds to help the owner find it."}
        </p>
      </div>

      <form onSubmit={submit} className="kh-simple-form">
        {/* Step 1: Photo (Tap to capture or upload) */}
        <div className="kh-form-group">
          <label className="kh-label">
            Photo of the item <span className="kh-opt">(Recommended)</span>
          </label>
          <label className="kh-photo-picker">
            {imageId ? (
              <div className="kh-photo-preview">
                <img
                  src={`/api/rvu/images/${imageId}`}
                  alt="Item preview"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setImageId("");
                  }}
                  className="kh-remove-photo"
                >
                  <X size={14} /> Remove
                </button>
              </div>
            ) : (
              <div className="kh-photo-placeholder">
                <div className="kh-camera-circle">
                  <Camera size={24} />
                </div>
                <strong>{uploading ? "Uploading photo…" : "Take or upload photo"}</strong>
                <span>Tap here to choose from camera or gallery</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Item photo"
              disabled={uploading || analysing}
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>

          {imageId && data?.config?.vision && (
            <button
              type="button"
              onClick={() => void analyse()}
              disabled={analysing}
              className="kh-ai-fill-btn"
            >
              <Sparkles size={14} />
              {analysing ? "Reading photo…" : "Auto-fill details from photo"}
            </button>
          )}
        </div>

        {/* Step 2: Item Name */}
        <div className="kh-form-group">
          <label className="kh-label">
            Item Name <span className="kh-req">*</span>
          </label>
          <input
            type="text"
            className="kh-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Blue Milton Water Bottle, Black Boat AirPods"
            required
            maxLength={100}
          />
        </div>

        {/* Step 3: Category */}
        <div className="kh-form-group">
          <label className="kh-label">
            Category <span className="kh-req">*</span>
          </label>
          <select
            className="kh-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Step 4: Where on campus? */}
        <div className="kh-form-group">
          <label className="kh-label">
            Where on campus? <span className="kh-req">*</span>
          </label>
          {/* Quick tap spots for mobile */}
          <div className="kh-spot-chips">
            {quickSpots.map((spot) => (
              <button
                type="button"
                key={spot}
                onClick={() => setLocationVal(spot)}
                className={`kh-spot-chip ${locationVal === spot ? "selected" : ""}`}
              >
                {spot}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="kh-input"
            name="location"
            value={locationVal}
            onChange={(e) => setLocationVal(e.target.value)}
            placeholder="e.g. 2nd Floor Library Desk, Bench near Canteen"
            required
            maxLength={120}
          />
        </div>

        {/* Step 5: Quick details & date */}
        <div className="kh-form-row">
          <div className="kh-form-group half">
            <label className="kh-label">
              Color <span className="kh-opt">(Optional)</span>
            </label>
            <input
              type="text"
              className="kh-input"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Matte Black"
              maxLength={50}
            />
          </div>
          <div className="kh-form-group half">
            <label className="kh-label">
              Brand <span className="kh-opt">(Optional)</span>
            </label>
            <input
              type="text"
              className="kh-input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Apple, Milton"
              maxLength={50}
            />
          </div>
        </div>

        {/* Step 6: Secret detail / description */}
        <div className="kh-form-group">
          <label className="kh-label">
            {kind === "lost"
              ? "Secret detail (only you know)"
              : "Identifying detail"}
            <span className="kh-opt"> (Optional)</span>
          </label>
          <textarea
            className="kh-textarea"
            name="privateDetail"
            rows={2}
            placeholder={
              kind === "lost"
                ? "e.g. Scratch on back, sticker with my name, contents inside bag..."
                : "e.g. Specific sticker, keychain, or mark on the item..."
            }
            maxLength={500}
          />
          <span className="kh-hint">
            🔒 This detail is kept private to confirm real ownership before handover.
          </span>
        </div>

        <input
          type="hidden"
          name="department"
          value={data?.user?.department || "Other"}
        />
        <input
          type="hidden"
          name="date"
          value={new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          })}
        />

        <ErrorBox message={error} />

        {/* Big Submit Button (Mobile Thumb Friendly) */}
        <div className="kh-submit-wrap">
          <button
            type="submit"
            disabled={busy || uploading}
            className={`kh-big-submit ${kind}`}
          >
            {busy
              ? "Submitting…"
              : kind === "lost"
              ? "Submit Lost Item Report"
              : "Submit Found Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
