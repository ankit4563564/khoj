"use client";
import { useEffect, useRef, useState, useId } from "react";
import { X, Upload, ImagePlus } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ProductArt({
  art,
  photo,
  name,
}: {
  art?: number;
  photo?: string;
  name: string;
}) {
  return photo ? (
    <img className="product-art" src={photo} alt={name} />
  ) : art !== undefined ? (
    <div
      role="img"
      aria-label={name}
      className="product-art generated"
      style={{ backgroundPosition: `${art * 50}% center` }}
    />
  ) : (
    <div className="product-art no-photo">
      <ImagePlus size={34} />
      <span>Photo kept private</span>
    </div>
  );
}
export function UploadPhotos({
  multiple = false,
  onChange,
}: {
  multiple?: boolean;
  onChange: (photos: string[]) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(files: FileList | null) {
    if (!files) return;
    setError("");
    const list = Array.from(files);
    if (list.length > (multiple ? 3 : 1)) {
      setError(multiple ? "Choose 2–3 photos." : "Choose one photo.");
      return;
    }
    if (
      list.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 10 * 1024 * 1024,
      )
    ) {
      setError("Use JPG, PNG or WebP images under 10 MB each.");
      return;
    }
    setBusy(true);
    try {
      const result = await Promise.all(
        list.map(
          (f) =>
            new Promise<string>((resolve, reject) => {
              const url = URL.createObjectURL(f),
                img = new Image();
              img.onload = () => {
                const c = document.createElement("canvas"),
                  scale = Math.min(1, 800 / Math.max(img.width, img.height));
                c.width = img.width * scale;
                c.height = img.height * scale;
                c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                resolve(c.toDataURL("image/jpeg", 0.75));
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("image"));
              };
              img.src = url;
            }),
        ),
      );
      setPhotos(result);
      onChange(result);
    } catch {
      setError("This image could not be opened. Try another photo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label className="upload">
        <Upload size={25} />
        <strong>
          {busy
            ? "Preparing photos…"
            : photos.length
              ? `${photos.length} photo${photos.length > 1 ? "s" : ""} selected`
              : multiple
                ? "Add 2–3 photos"
                : "Add a photo"}
        </strong>
        <span>JPG, PNG or WebP · up to 10 MB each</span>
        <input
          aria-label={multiple ? "Item photos" : "Found item photo"}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={busy}
          onChange={(e) => load(e.target.files)}
        />
      </label>
      {photos.length > 0 && (
        <div className="thumbnails">
          {photos.map((p, i) => (
            <img key={i} src={p} alt={`Selected photo ${i + 1}`} />
          ))}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
