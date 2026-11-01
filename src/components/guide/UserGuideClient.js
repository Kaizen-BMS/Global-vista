"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";
import { USER_GUIDE_LANGUAGES, USER_GUIDE_CONTENT, USER_GUIDE_FOOTER } from "@/lib/content/userGuide";

const STORAGE_KEY = "gv:guide:lang";

function GuideSection({ title, body, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/40 transition text-left">
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-2">
          {body.map((line, i) => <p key={i} className="text-muted-foreground text-sm leading-relaxed">{line}</p>)}
        </div>
      )}
    </div>
  );
}

/** Schools-only User Guide — language-switchable (English/Hindi/Punjabi),
 * grouped into "Everyday Use" (everyone) and "Oversight & Management"
 * (Chair & Principal). Content lives in src/lib/content/userGuide/, this
 * component just renders + switches language, persisted per-browser. */
export default function UserGuideClient() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && USER_GUIDE_LANGUAGES.some((l) => l.code === saved)) setLang(saved);
    } catch { /* ignore */ }
  }, []);

  function changeLang(code) {
    setLang(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }

  const groups = USER_GUIDE_CONTENT[lang] || USER_GUIDE_CONTENT.en;
  const footer = USER_GUIDE_FOOTER[lang] || USER_GUIDE_FOOTER.en;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-1.5 rounded-full border border-border p-1 w-fit">
          {USER_GUIDE_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${lang === l.code ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.id}>
            <h2 className="text-foreground font-medium mb-3">{group.title}</h2>
            <div className="space-y-2">
              {group.sections.map((section, i) => (
                <GuideSection key={section.id} title={section.title} body={section.body} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground text-sm mt-8">{footer}</p>
    </div>
  );
}
