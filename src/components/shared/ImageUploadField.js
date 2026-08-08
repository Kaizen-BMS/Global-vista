"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, X, Loader2, ImageIcon } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Drag-drop / browse image upload with instant preview. Uploading writes the
 * file to storage right away and calls onChange(url) so the parent form's
 * existing Save button persists the URL like any other field — "preview
 * before save" falls out naturally from that split.
 */
export default function ImageUploadField({ label, hint, value, onChange, uploadUrl, category }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Use PNG, JPG, WEBP, or SVG."); return; }
    if (file.size > MAX_SIZE_BYTES) { toast.error(`File must be under ${MAX_SIZE_BYTES / 1024 / 1024}MB.`); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      const res = await apiFetch(uploadUrl, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onChange(data.url);
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <label className="block text-sm text-foreground mb-1">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-border"}`}
      >
        <div className="h-14 w-14 shrink-0 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-xs truncate">{value ? "Uploaded" : "Drag & drop, or browse"}</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors disabled:opacity-50"
            >
              Browse files
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-red-400 cursor-pointer transition-colors"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
        </div>
        <UploadCloud className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}
    </div>
  );
}
