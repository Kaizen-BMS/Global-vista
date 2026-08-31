/** Shared shell for the site's static legal pages (Privacy Policy, Terms
 * of Service) — same dark/gold editorial look as the rest of the Global
 * Vista Educators marketing site (see Footer.jsx for the same color
 * tokens), just simple prose instead of a rendered doc/PDF. Both pages
 * live at plain root routes (no route-group prefix) so LayoutWrapper's
 * exclusion list doesn't catch them — they render inside the normal
 * Navbar/Footer shell, matching every other marketing page. */
export default function LegalPageLayout({ title, lastUpdated, intro, sections }) {
  return (
    <div className="relative mx-auto max-w-4xl px-6 py-24 lg:px-10 lg:py-32">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Global Vista Educators</p>
      <h1 className="font-display mt-3 text-4xl font-semibold text-offwhite sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated: {lastUpdated}</p>
      {intro && <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">{intro}</p>}

      <div className="mt-12 space-y-10 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:p-12">
        {sections.map((s, i) => (
          <section key={s.heading} id={`section-${i + 1}`} className="scroll-mt-24">
            <h2 className="font-display text-lg font-semibold text-offwhite sm:text-xl">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
              {s.body.map((p, j) => (
                Array.isArray(p) ? (
                  <ul key={j} className="list-disc space-y-1.5 pl-5">
                    {p.map((item, k) => <li key={k}>{item}</li>)}
                  </ul>
                ) : (
                  <p key={j}>{p}</p>
                )
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
