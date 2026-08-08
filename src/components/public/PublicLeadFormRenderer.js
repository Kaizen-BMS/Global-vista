"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * Also used, with `preview`, as the Lead Form Builder's live preview — so the
 * builder can never visually drift from what the real public page renders.
 * In preview mode there's no real slug/backend to hit: the view-ping is
 * skipped and "submitting" just shows the configured success state locally.
 */
export default function PublicLeadFormRenderer({ form, branding, preview = false }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const startedAt = useRef(Date.now());
  const primaryColor = branding?.primary_color || form.theme_config?.primaryColor || "#4f46e5";
  const source = searchParams.get("src") === "qr" ? "qr" : "link";

  useEffect(() => {
    if (preview) return;
    fetch(`/api/public/forms/${form.slug}/view`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setValue(type, v) { setValues((cur) => ({ ...cur, [type]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (preview) {
      await new Promise((r) => setTimeout(r, 400));
      setResult({ successMessage: form.success_message });
      setSubmitting(false);
      return;
    }

    try {
      const utmPayload = {};
      for (const key of ["source", "medium", "campaign", "term", "content"]) {
        const v = searchParams.get(`utm_${key}`);
        if (v) utmPayload[`utm_${key}`] = v;
      }
      const res = await fetch(`/api/public/forms/${form.slug}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, ...utmPayload, __completionMs: Date.now() - startedAt.current }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); setSubmitting(false); return; }
      if (data.redirectUrl) { router.push(data.redirectUrl); return; }
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className={preview ? "flex items-center justify-center bg-black rounded-2xl py-16 px-4" : "min-h-screen flex items-center justify-center bg-black px-4"}>
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: primaryColor }} />
          <p className="text-white text-lg font-medium">{result.successMessage || "Thank you! We'll be in touch shortly."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={preview ? "bg-black rounded-2xl px-4 py-10 flex items-center justify-center" : "min-h-screen bg-black px-4 py-16 flex items-center justify-center"}>
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          {branding?.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={branding.logo_url} alt={branding.name} className="h-14 w-14 object-contain rounded-lg mb-3" />
          ) : (
            <div className="h-14 w-14 rounded-lg mb-3 flex items-center justify-center text-white text-xl font-semibold" style={{ backgroundColor: primaryColor }}>
              {(branding?.name || form.name).charAt(0)}
            </div>
          )}
          {branding?.name && <p className="text-neutral-500 text-sm">{branding.name}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8">
          <h1 className="text-white text-xl font-semibold mb-1">{form.name}</h1>
          {form.description && <p className="text-neutral-500 text-sm mb-6">{form.description}</p>}

          <div className="space-y-4">
            {form.fields_config.map((field, i) => (
              <div key={i}>
                <label className="block text-sm text-neutral-300 mb-1.5">{field.label}{field.required && <span style={{ color: primaryColor }}> *</span>}</label>
                {field.type === "message" ? (
                  <textarea
                    rows={3} required={field.required} placeholder={field.placeholder}
                    value={values[field.type] || ""} onChange={(e) => setValue(field.type, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": primaryColor }}
                  />
                ) : (
                  <input
                    type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                    required={field.required} placeholder={field.placeholder}
                    value={values[field.type] || ""} onChange={(e) => setValue(field.type, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": primaryColor }}
                  />
                )}
              </div>
            ))}

            {/* Honeypot — hidden from real visitors via CSS, never rendered as a visible/tabbable field. Bots that fill every input trip this. */}
            <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
              <label htmlFor="website">Leave blank</label>
              <input id="website" type="text" tabIndex={-1} autoComplete="off" value={values.__hp || ""} onChange={(e) => setValue("__hp", e.target.value)} />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <button
            type="submit" disabled={submitting}
            className="flex items-center justify-center gap-2 w-full mt-6 px-4 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer transition"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit
          </button>
        </form>

        <p className="text-center text-neutral-700 text-xs mt-6">Powered by Global Vista</p>
      </div>
    </div>
  );
}
