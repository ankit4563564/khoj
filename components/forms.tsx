"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, MapPin, ShieldCheck } from "lucide-react";
import {
  categories,
  locations,
  id,
  type Item,
  type RecoveryCase,
} from "@/lib/model";
import { UploadPhotos } from "./ui";
export function RegisterForm({ onSave }: { onSave: (item: Item) => void }) {
  const [photos, setPhotos] = useState<string[]>([]),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (photos.length < 2) {
      setError("Add at least two photos from different angles.");
      return;
    }
    onSave({
      id: id("ITEM"),
      name: String(f.get("name")).trim(),
      category: String(f.get("category")),
      brand: String(f.get("brand")).trim(),
      detail: String(f.get("detail")).trim(),
      photos,
      status: "SAFE",
    });
  }
  return (
    <form onSubmit={submit} className="form">
      <p className="muted">
        Register it once. Give it a better chance of finding its way back.
      </p>
      <UploadPhotos multiple onChange={setPhotos} />
      <label>
        Item name
        <input
          name="name"
          placeholder="e.g. My everyday headphones"
          required
          maxLength={80}
        />
      </label>
      <div className="form-row">
        <label>
          Category
          <select name="category">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Brand <span className="optional">optional</span>
          <input name="brand" placeholder="e.g. Sony" maxLength={60} />
        </label>
      </div>
      <label>
        One unique identifying detail
        <textarea
          name="detail"
          placeholder="A scratch, engraving, sticker, or something only you would know…"
          required
          minLength={8}
          maxLength={500}
        />
      </label>
      <small className="privacy-note">
        <ShieldCheck size={16} /> This detail stays private and helps verify
        ownership.
      </small>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary" type="submit">
        Register item <ArrowRight size={17} />
      </button>
    </form>
  );
}
export function FoundForm({
  onSave,
  onPhone,
}: {
  onSave: (c: RecoveryCase) => void;
  onPhone: (id: string, phone: string) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]),
    [error, setError] = useState(""),
    [report, setReport] = useState<RecoveryCase | null>(null),
    [subscribed, setSubscribed] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photos.length) {
      setError("Add a clear photo of the item first.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const c: RecoveryCase = {
      id: id("KJ"),
      category: "Other",
      photo: photos[0],
      location: String(f.get("location")),
      status: "UNCLAIMED",
      source: "found_report",
      ownerConfirmed: false,
      finderConfirmed: false,
      reward: "NOT_OFFERED",
      createdAt: new Date().toISOString(),
    };
    onSave(c);
    setReport(c);
  }
  if (report)
    return (
      <div className="form-panel success">
        <div className="success-mark">
          <Check />
        </div>
        <h2>A small act. A big difference.</h2>
        <p>
          Your report <strong>{report.id}</strong> has been saved in this
          browser.
        </p>
        <p className="muted">
          It is awaiting review. Keep the item safe or leave it with your campus
          help desk.
        </p>
        <div className="notice">
          Demo: no AI search or notifications have been sent.
        </div>
        {!subscribed ? (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onPhone(report.id, String(f.get("phone")));
              setSubscribed(true);
            }}
          >
            <label>
              Phone number <span className="optional">optional</span>
              <input
                name="phone"
                type="tel"
                pattern="[+]?[0-9 ()-]{10,16}"
                placeholder="Your number for case updates"
                required
              />
            </label>
            <p className="muted small">
              Demo only: saves to this browser. SMS delivery is not connected.
            </p>
            <button className="secondary">Save contact preference</button>
          </form>
        ) : (
          <p className="positive">Contact preference saved.</p>
        )}
        <a href="/board" className="text-link">
          View unclaimed board <ArrowRight size={16} />
        </a>
      </div>
    );
  return (
    <form onSubmit={submit} className="form form-panel">
      <div className="form-intro">
        <span className="step-number">01</span>
        <div>
          <h3>A photo is a good start.</h3>
          <p className="muted">Get the whole item in frame, in good light.</p>
        </div>
      </div>
      <UploadPhotos onChange={setPhotos} />
      <div className="form-intro">
        <span className="step-number">02</span>
        <div>
          <h3>Where did you find it?</h3>
          <p className="muted">A little context helps it get home.</p>
        </div>
      </div>
      <label>
        <span className="sr-only">Found location</span>
        <select required name="location" defaultValue="">
          <option value="" disabled>
            Select a campus location
          </option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary">
        Submit found item <ArrowRight size={18} />
      </button>
      <p className="small muted centered">
        No account. No OTP. Just a little kindness.
      </p>
    </form>
  );
}
export function LostForm({
  item,
  onSave,
}: {
  item: Item;
  onSave: (location: string, time: string) => void;
}) {
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave(String(f.get("location")), String(f.get("time")));
      }}
    >
      <p className="muted">
        We’ll keep {item.name} in your lost items so it is ready for matching.
      </p>
      <label>
        Last seen <span className="optional">optional</span>
        <select name="location" defaultValue="">
          <option value="">Not sure</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Approximate time <span className="optional">optional</span>
        <input type="datetime-local" name="time" />
      </label>
      <button className="primary">
        <MapPin size={18} /> Mark as lost
      </button>
    </form>
  );
}
