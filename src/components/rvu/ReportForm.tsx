"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  Sparkles,
  X,
  CheckCircle2,
  Package,
  MapPin,
  Check,
  Building2,
  Lock,
} from "lucide-react";
import { usePortal } from "./PortalProvider";
import { ErrorBox, Guard } from "./Common";
import { featureApi } from "./IdentityPage";

export default function ReportForm({ kind }: { kind: "lost" | "found" }) {
  if (kind === "found") return <FoundReportView />;
  return (
    <Guard>
      <LostReportView />
    </Guard>
  );
}

/**
 * ULTRA-FAST ZERO-FRICTION FINDER FLOW
 * The finder ONLY uploads a photo and taps a location chip!
 * AI automatically identifies the item, writes description, and handles the rest.
 */
function FoundReportView() {
  const { act, toast, refresh } = usePortal();
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [imageId, setImageId] = useState("");
  const [detectedTitle, setDetectedTitle] = useState("");
  const [detectedCategory, setDetectedCategory] = useState("Electronics");
  const [detectedColor, setDetectedColor] = useState("");
  const [detectedBrand, setDetectedBrand] = useState("");
  const [detectedDesc, setDetectedDesc] = useState("");
  const [locationVal, setLocationVal] = useState("Central Library");
  const [custodyLocation, setCustodyLocation] = useState("Left at Helpdesk / Reception");

  const campusSpots = [
    "Central Library",
    "Student Cafeteria",
    "Tech Block 2nd Floor",
    "Campus Reception Desk",
    "Sports Ground",
    "Audi / Quad",
  ];

  async function handlePhoto(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a photo smaller than 10 MB.");
      return;
    }

    setUploading(true);
    setAnalysing(true);
    try {
      // 1. Upload photo
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/rvu/upload", {
        method: "POST",
        body: form,
      });
      const uploadResult = await res.json();
      if (!res.ok) throw new Error(uploadResult.error || "Failed to upload photo");

      setImageId(uploadResult.id);
      setUploading(false);

      // 2. Automatically trigger AI Vision to extract everything
      try {
        const aiRes = await fetch("/api/rvu/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId: uploadResult.id }),
        });
        const aiData = await aiRes.json();
        if (aiRes.ok && aiData.title) {
          setDetectedTitle(aiData.title);
          if (aiData.category) setDetectedCategory(aiData.category);
          if (aiData.color) setDetectedColor(aiData.color);
          if (aiData.brand) setDetectedBrand(aiData.brand);
          if (aiData.description) setDetectedDesc(aiData.description);
          toast(`✨ AI identified: ${aiData.title}`);
        } else {
          setDetectedTitle("Found Campus Item");
        }
      } catch {
        setDetectedTitle("Found Campus Item");
      }
    } catch (err: any) {
      setError(err?.message || "Could not upload image. Please try again.");
    } finally {
      setUploading(false);
      setAnalysing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageId) {
      setError("Please take or upload a photo of the found item.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const finalTitle = detectedTitle.trim() || "Found Campus Item";
      const finalLocation = locationVal.trim() || "RVU Campus";
      const finalDesc =
        detectedDesc.trim() ||
        `${finalTitle} found on campus at ${finalLocation}. ${custodyLocation ? `Status: ${custodyLocation}.` : ""}`;

      const payload = {
        action: "found_report",
        title: finalTitle,
        category: detectedCategory || "Electronics",
        color: detectedColor || "",
        brand: detectedBrand || "",
        description: finalDesc,
        location: finalLocation,
        custodyLocation: custodyLocation,
        date: new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }),
        department: "Other",
        imageId: imageId,
        privateDetail: "",
      };

      const result = await featureApi("public", payload);
      await refresh();
      toast("🎉 Found item posted! Thank you for helping.");
      router.push(`/finder/cases/${result.id}`);
    } catch (err: any) {
      setError(err?.message || "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kh-form-container">
      <Link href="/" className="kh-back-nav">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="kh-form-header">
        <span className="kh-form-pill found">
          🟢 10-Second Quick Report • No login needed
        </span>
        <h1>Found something on campus?</h1>
        <p>
          Just snap a photo. AI will automatically describe and catalog it so the owner can find it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="kh-simple-form">
        {/* Step 1: Big Photo Capture / Picker */}
        <div className="kh-form-group">
          <label className="kh-label">
            1. Snap a Photo of the item <span className="kh-req">*</span>
          </label>
          <label className="kh-photo-picker">
            {imageId ? (
              <div className="kh-photo-preview">
                <img src={`/api/rvu/images/${imageId}`} alt="Found item" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setImageId("");
                    setDetectedTitle("");
                  }}
                  className="kh-remove-photo"
                >
                  <X size={14} /> Retake Photo
                </button>
              </div>
            ) : (
              <div className="kh-photo-placeholder">
                <div className="kh-camera-circle">
                  <Camera size={26} />
                </div>
                <strong>
                  {uploading
                    ? "Uploading photo…"
                    : analysing
                    ? "✨ AI is identifying item…"
                    : "Tap to Take Photo or Upload"}
                </strong>
                <span>Camera opens automatically on your phone</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={uploading || analysing}
              onChange={(e) => void handlePhoto(e.target.files?.[0])}
            />
          </label>

          {/* AI Detection Banner */}
          {analysing && (
            <div className="kh-ai-status-banner">
              <span className="kh-pulse-dot" />
              <span>AI is reading photo and filling description…</span>
            </div>
          )}

          {detectedTitle && !analysing && (
            <div className="kh-ai-success-banner">
              <Sparkles size={16} className="kh-sparkle-icon" />
              <div>
                <strong>AI Identified:</strong> {detectedTitle}
                <span className="kh-ai-badge">({detectedCategory})</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Where did you find it? (1-Tap Chips) */}
        <div className="kh-form-group">
          <label className="kh-label">
            2. Where did you spot it? <span className="kh-req">*</span>
          </label>
          <div className="kh-spot-chips">
            {campusSpots.map((spot) => (
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
            value={locationVal}
            onChange={(e) => setLocationVal(e.target.value)}
            placeholder="e.g. 2nd Floor Library Desk"
            required
            maxLength={100}
          />
        </div>

        {/* Step 3: Where is it right now? (1-Tap) */}
        <div className="kh-form-group">
          <label className="kh-label">
            3. Where are you leaving the item?
          </label>
          <div className="kh-custody-chips">
            <button
              type="button"
              onClick={() => setCustodyLocation("Left at Helpdesk / Reception")}
              className={`kh-custody-chip ${custodyLocation.includes("Helpdesk") ? "selected" : ""}`}
            >
              <Building2 size={16} />
              <span>Handed to Campus Reception / Helpdesk</span>
            </button>
            <button
              type="button"
              onClick={() => setCustodyLocation("Kept with me")}
              className={`kh-custody-chip ${custodyLocation.includes("with me") ? "selected" : ""}`}
            >
              <Package size={16} />
              <span>With me for now</span>
            </button>
          </div>
        </div>

        <ErrorBox message={error} />

        {/* Big Submit Button */}
        <div className="kh-submit-wrap">
          <button
            type="submit"
            disabled={busy || uploading || analysing || !imageId}
            className="kh-big-submit found"
          >
            {busy
              ? "Posting found item…"
              : uploading || analysing
              ? "Analyzing photo with AI…"
              : "🚀 Post Found Item (Done!)"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * SIMPLE 30-SECOND LOST REPORT FLOW
 * Fast, clear, and alerts the student when their item is matched.
 */
function LostReportView() {
  const { act, toast } = usePortal();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [locationVal, setLocationVal] = useState("Central Library");
  const [color, setColor] = useState("");
  const [privateDetail, setPrivateDetail] = useState("");
  const [imageId, setImageId] = useState("");
  const [uploading, setUploading] = useState(false);

  const categoriesList = [
    "Electronics",
    "Cards & IDs",
    "Keys",
    "Bottles & Tumblers",
    "Bags & Backpacks",
    "Books & Notes",
    "Clothing",
    "Other",
  ];

  const campusSpots = [
    "Central Library",
    "Student Cafeteria",
    "Tech Block 2nd Floor",
    "Campus Reception Desk",
    "Sports Ground",
    "Audi / Quad",
  ];

  async function handlePhoto(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a photo smaller than 10 MB.");
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
      const uploadResult = await res.json();
      if (!res.ok) throw new Error(uploadResult.error || "Failed to upload photo");
      setImageId(uploadResult.id);
      toast("Photo uploaded!");
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter the name of the lost item.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const finalTitle = title.trim();
      const finalLocation = locationVal.trim() || "RVU Campus";
      const finalDesc = `${finalTitle} (${category}) lost near ${finalLocation}. ${color ? `Color: ${color}.` : ""}`;

      const payload = {
        kind: "lost",
        title: finalTitle,
        category: category,
        color: color.trim(),
        brand: "",
        description: finalDesc,
        location: finalLocation,
        department: "Other",
        date: new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }),
        imageId: imageId || null,
        privateDetail: privateDetail.trim(),
      };

      const result = await act("create_report", payload);
      toast("Lost report submitted! We'll alert you if a match is found.");
      router.push(`/items/${result.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to submit lost report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kh-form-container">
      <Link href="/" className="kh-back-nav">
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="kh-form-header">
        <span className="kh-form-pill lost">
          🔴 Report a Lost Item
        </span>
        <h1>What did you lose?</h1>
        <p>
          Fill in a few quick details. We’ll notify you as soon as someone finds it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="kh-simple-form">
        {/* Item Name */}
        <div className="kh-form-group">
          <label className="kh-label">
            1. What item did you lose? <span className="kh-req">*</span>
          </label>
          <input
            type="text"
            className="kh-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Blue Milton Water Bottle, Black boAt AirPods"
            required
            maxLength={100}
          />
        </div>

        {/* Category Pills */}
        <div className="kh-form-group">
          <label className="kh-label">
            2. Category <span className="kh-req">*</span>
          </label>
          <div className="kh-pill-selector">
            {categoriesList.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                className={`kh-selector-pill ${category === cat ? "selected" : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Where on campus */}
        <div className="kh-form-group">
          <label className="kh-label">
            3. Where do you think you lost it? <span className="kh-req">*</span>
          </label>
          <div className="kh-spot-chips">
            {campusSpots.map((spot) => (
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
            value={locationVal}
            onChange={(e) => setLocationVal(e.target.value)}
            placeholder="e.g. 2nd Floor Study Room, Cafeteria Table"
            required
            maxLength={100}
          />
        </div>

        {/* Secret Mark */}
        <div className="kh-form-group">
          <label className="kh-label">
            4. Secret detail only you know <span className="kh-opt">(Optional)</span>
          </label>
          <input
            type="text"
            className="kh-input"
            value={privateDetail}
            onChange={(e) => setPrivateDetail(e.target.value)}
            placeholder="e.g. Scratch near corner, Pikachu sticker, initial written inside"
            maxLength={300}
          />
          <span className="kh-hint">
            🔒 Kept secret to make sure only you can claim your item.
          </span>
        </div>

        {/* Optional Photo */}
        <div className="kh-form-group">
          <label className="kh-label">
            5. Reference photo <span className="kh-opt">(Optional)</span>
          </label>
          <label className="kh-photo-picker small">
            {imageId ? (
              <div className="kh-photo-preview">
                <img src={`/api/rvu/images/${imageId}`} alt="Preview" />
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
              <div className="kh-photo-placeholder small">
                <Camera size={20} />
                <span>{uploading ? "Uploading…" : "Add a photo of item (if you have one)"}</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => void handlePhoto(e.target.files?.[0])}
            />
          </label>
        </div>

        <ErrorBox message={error} />

        {/* Big Submit Button */}
        <div className="kh-submit-wrap">
          <button
            type="submit"
            disabled={busy || uploading}
            className="kh-big-submit lost"
          >
            {busy ? "Submitting lost report…" : "🔍 Alert Me When Found"}
          </button>
        </div>
      </form>
    </div>
  );
}
