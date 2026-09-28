"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  UploadCloud,
  LockKeyhole,
  Check,
  Sparkles,
  X,
} from "lucide-react";
import { categories, departments, locations } from "@/lib/rvu/types";
import { usePortal } from "./PortalProvider";
import { ErrorBox, Guard } from "./Common";
import { featureApi } from './IdentityPage';
export default function ReportForm({ kind }: { kind: "lost" | "found" }) {
  if(kind==='found')return <Form kind={kind}/>;
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
    [description, setDescription] = useState("");
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function analyse() {
    setAnalysing(true);
    setError("");
    try {
      const res = await fetch("/api/rvu/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error);
      setTitle(r.title);
      setCategory(r.category);
      setColor(r.color);
      setBrand(r.brand);
      setDescription(r.description);
      toast("Photo analysed. Review the details before submitting.");
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
        kind,
        imageId,
        title,
        category,
        color,
        brand,
        description,
      };
      const result = kind==='found' ? await featureApi('public',{action:'found_report',...valuesToSend}) : await act('create_report',valuesToSend);
      if(kind==='found')await refresh();
      toast("Report submitted. We’ll keep you posted.");
      router.push(kind==='found'?`/finder/cases/${result.id}`:`/items/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rv-form-page">
      {kind==='found'&&<div className="kh-found-id-entry"><span>No account needed.</span><Link href="/found-id">Found a college ID? Scan its QR →</Link></div>}
      <Link href={kind === "found" && !data.user ? "/about" : "/board"} className="rv-back">
        <ArrowLeft size={16} />
        {kind === "found" && !data.user ? "Back to home" : "Back to campus board"}
      </Link>
      <div className="rv-page-heading">
        <div>
          <span className="rv-eyebrow">
            {kind === "lost"
              ? "LET’S FIND IT TOGETHER"
              : "THANK YOU FOR LOOKING OUT"}
          </span>
          <h1>Report a {kind} item.</h1>
          <p>
            {kind === "lost"
              ? "Tell us what’s missing. We’ll look for possible matches."
              : "A few details could make someone’s day."}
          </p>
        </div>
        <span className={`rv-form-kind ${kind}`}>
          {kind === "lost" ? "LOST" : "FOUND"}
        </span>
      </div>
      <form onSubmit={submit} className="rv-report-layout">
        <div>
          <section className="rv-panel">
            <div className="rv-form-section">
              <span>01</span>
              <div>
                <h2>The item</h2>
                <p>Make it easy to recognise.</p>
              </div>
            </div>
            <label className="rv-upload">
              {imageId ? (
                <>
                  <img
                    src={`/api/rvu/images/${imageId}`}
                    alt="Uploaded item preview"
                  />
                  <span>Click to replace photo</span>
                </>
              ) : (
                <>
                  <UploadCloud size={32} strokeWidth={1.5} />
                  <strong>
                    {uploading
                      ? "Uploading your photo…"
                      : "Add a photo of the item"}
                  </strong>
                  <span>Click to upload · JPG, PNG or WebP · up to 5 MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Item photo"
                disabled={uploading || analysing}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            {imageId && (
              <div className="rv-upload-actions">
                <button
                  type="button"
                  className="rv-text-button"
                  onClick={() => setImageId("")}
                >
                  <X size={14} />
                  Remove photo
                </button>
                {data.config.vision && (
                  <button
                    type="button"
                    className="rv-text-button"
                    disabled={analysing}
                    onClick={() => void analyse()}
                  >
                    <Sparkles size={14} />
                    {analysing ? "Reading photo…" : "Fill details from photo"}
                  </button>
                )}
              </div>
            )}
            {data.config.vision && imageId && (
              <p className="rv-helper">
                This sends your photo to Google for suggestions. Skip any
                personal IDs or contact details.
              </p>
            )}
            <label className="rv-field">
              ITEM NAME
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Black Sony headphones"
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
                    Select a category
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
                  placeholder="e.g. Black"
                  maxLength={60}
                />
              </label>
            </div>
            <label className="rv-field">
              BRAND <span className="rv-optional">optional</span>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Sony"
                maxLength={80}
              />
            </label>
            <label className="rv-field">
              PUBLIC DESCRIPTION
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item’s appearance. Keep unique ownership details private."
                required
                minLength={10}
                maxLength={2000}
                rows={4}
              />
            </label>
          </section>
          <section className="rv-panel">
            <div className="rv-form-section">
              <span>02</span>
              <div>
                <h2>Where & when</h2>
                <p>
                  {kind === "lost"
                    ? "The last place you remember having it."
                    : "Where you found the item."}
                </p>
              </div>
            </div>
            <label className="rv-field">
              CAMPUS LOCATION
              <input
                name="location"
                list="rvu-locations"
                placeholder="Choose or enter a campus location"
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
                SCHOOL
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
          <section className="rv-panel">
            <div className="rv-form-section">
              <span>03</span>
              <div>
                <h2>Private identifying detail</h2>
                <p>Only you and authorised staff can see this.</p>
              </div>
              <LockKeyhole size={20} />
            </div>
            <label className="rv-field">
              OWNERSHIP DETAIL <span className="rv-optional">optional</span>
              <textarea
                name="privateDetail"
                placeholder={
                  kind === "lost"
                    ? "A unique scratch, engraving, sticker, or what’s inside."
                    : "A detail the owner should be able to describe."
                }
                rows={3}
                maxLength={1000}
              />
            </label>
          </section>
          <ErrorBox message={error} />
          <div className="rv-form-submit">
            <Link href={kind === "found" && !data.user ? "/about" : "/board"} className="rv-button">
              Cancel
            </Link>
            <button
              className="rv-button primary"
              disabled={busy || uploading || analysing}
            >
              {busy ? "Submitting…" : `Submit ${kind} report`}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
        <aside className="rv-form-aside">
          <span className="rv-eyebrow">A GOOD REPORT GOES A LONG WAY</span>
          <h3>A few things to keep in mind.</h3>
          {[
            "Use a clear photo if you have one.",
            "Keep phone numbers and personal IDs out of public descriptions.",
            "Save distinctive details for private ownership verification.",
            "Collect or hand over items only through authorised staff.",
          ].map((t) => (
            <p key={t}>
              <Check size={17} />
              {t}
            </p>
          ))}
          <div className="rv-aside-note">
            <LockKeyhole size={21} />
            <strong>Safe by design.</strong>
            <p>
              Your contact information and private details aren’t shared on the
              campus board.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
