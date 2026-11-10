const marqueeItems = [
  "Punjab School Education Board - Project Udaan",
  "International Summer School Visits",
  "CERN Educational Visits",
];

export default function MarqueeSection() {
  const items = [...marqueeItems, ...marqueeItems];

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-6">
      <div className="flex w-max animate-marquee-slow">
        {items.map((item, i) => (
          <div
            key={i}
            className="mx-8 flex shrink-0 items-center gap-4 whitespace-nowrap"
          >
            {/* A soft tinted pill, not a loud one — just enough to lift
                the text off the background so it's easier to read while
                it scrolls past. */}
            <span className="rounded-full border border-[#D89B1D]/20 bg-[#D89B1D]/[0.07] px-4 py-1.5 text-sm uppercase tracking-[0.2em] text-slate-200">
              {item}
            </span>

            <span className="h-1.5 w-1.5 rounded-full bg-[#D89B1D]/70" />
          </div>
        ))}
      </div>
    </section>
  );
}