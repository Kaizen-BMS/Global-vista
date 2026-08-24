"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, Upload, ExternalLink } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm";

function PostForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: initial?.title || "", excerpt: initial?.excerpt || "", content: initial?.content || "",
    coverImageUrl: initial?.cover_image_url || "", status: initial?.status || "draft",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/platform/blog/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setForm((f) => ({ ...f, coverImageUrl: data.url }));
    } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = initial ? `/api/platform/blog/${initial.id}` : "/api/platform/blog";
      const res = await apiFetch(url, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      toast.success(initial ? "Post updated." : "Post created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <ModalFocusTrap>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={initial ? "Edit Post" : "New Post"} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{initial ? "Edit Post" : "New Post"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <input required aria-label="Title" placeholder="Post title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
          <textarea aria-label="Excerpt" placeholder="Short excerpt (shown on the homepage teaser and blog listing)" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={inputClass} />

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Cover Image</label>
            <div className="flex items-center gap-3">
              {form.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverImageUrl} alt="" className="h-14 w-24 object-cover rounded-lg border border-border shrink-0" />
              )}
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-xs cursor-pointer hover:bg-accent transition">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {form.coverImageUrl ? "Replace image" : "Upload image"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
              </label>
            </div>
          </div>

          <textarea required aria-label="Content" placeholder="Post content" rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={`${inputClass} font-mono text-xs`} />
          <p className="text-muted-foreground text-[11px]">Plain text / basic HTML — rendered as-is on the post page.</p>

          <select aria-label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            <option value="draft">Draft — not visible publicly</option>
            <option value="published">Published — visible on /blog</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </form>
      </ModalFocusTrap>
    </div>
  );
}

function DeleteButton({ post, onDeleted }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/blog/${post.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete.");
      toast.success("Post deleted.");
      onDeleted();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <button onClick={remove} disabled={busy} aria-label={`Delete ${post.title}`} className="text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-60 transition">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function BlogManager({ posts }) {
  const router = useRouter();
  const [editing, setEditing] = useState(undefined);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditing(null)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> New Post
        </button>
      </div>
      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm bg-card border border-border rounded-xl p-6 text-center">No blog posts yet.</p>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              {p.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image_url} alt="" className="h-12 w-20 object-cover rounded-lg border border-border shrink-0" />
              ) : (
                <div className="h-12 w-20 rounded-lg bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium truncate">{p.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${p.status === "published" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}`}>{p.status}</span>
                  <span className="text-muted-foreground text-[11px]">/{p.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {p.status === "published" && (
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${p.title}`} className="text-muted-foreground hover:text-foreground cursor-pointer"><ExternalLink className="h-3.5 w-3.5" /></a>
                )}
                <button onClick={() => setEditing(p)} aria-label={`Edit ${p.title}`} className="text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                <DeleteButton post={p} onDeleted={() => router.refresh()} />
              </div>
            </div>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <PostForm initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); router.refresh(); }} />
      )}
    </div>
  );
}
