"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Share2, Printer, ExternalLink } from "lucide-react";

export default function LeadFormShareCard({ slug, formId }) {
  const [publicUrl, setPublicUrl] = useState("");

  if (typeof window !== "undefined" && !publicUrl) {
    setPublicUrl(`${window.location.origin}/forms/${slug}`);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied.");
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "Fill out this form", url: publicUrl }); } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-4">Public Form</p>

      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700">
        <p className="flex-1 text-neutral-300 text-xs truncate">{publicUrl}</p>
        <button onClick={copyLink} className="text-neutral-400 hover:text-white cursor-pointer shrink-0"><Copy className="h-3.5 w-3.5" /></button>
      </div>

      <div id="qr-print-area" className="flex justify-center mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/leads/forms/${formId}/qr?format=png`} alt="QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={`/api/leads/forms/${formId}/qr?format=png`} download={`${slug}-qr.png`} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs transition cursor-pointer"><Download className="h-3.5 w-3.5" /> PNG</a>
        <a href={`/api/leads/forms/${formId}/qr?format=svg`} download={`${slug}-qr.svg`} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs transition cursor-pointer"><Download className="h-3.5 w-3.5" /> SVG</a>
        <button onClick={share} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs transition cursor-pointer"><Share2 className="h-3.5 w-3.5" /> Share</button>
        <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs transition cursor-pointer"><Printer className="h-3.5 w-3.5" /> Print QR</button>
      </div>

      <a href={publicUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 mt-3 px-3 py-2 rounded-lg btn-brand text-white text-xs font-medium cursor-pointer">
        <ExternalLink className="h-3.5 w-3.5" /> Open Form
      </a>
    </div>
  );
}
