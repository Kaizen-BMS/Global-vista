import Image from "next/image";
import Link from "next/link";
import { listPublishedBlogPosts, estimateReadMinutes } from "@/lib/platform/actions/blog";
import PlatformHomeNavbar from "@/components/platformHome/PlatformHomeNavbar";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { PAGE_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_FAINT, BORDER, BORDER_SOFT, ACCENT } from "@/components/platformHome/editorialTheme";

export const metadata = { title: "Blog — KaizenBMS Platform" };
export const dynamic = "force-dynamic";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await listPublishedBlogPosts();

  return (
    <div className={`${PAGE_BG} ${TEXT_PRIMARY} min-h-screen overflow-x-hidden antialiased`}>
      <PlatformHomeNavbar />

      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 pt-36 sm:pt-44 pb-24">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${BORDER}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ACCENT} bg-current`} />
          <span className={`text-xs font-medium ${TEXT_SECONDARY}`}>Insights & updates</span>
        </div>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">From the KaizenBMS blog</h1>

        {posts.length === 0 ? (
          <p className={`mt-14 text-sm ${TEXT_SECONDARY}`}>No posts published yet — check back soon.</p>
        ) : (
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="group block cursor-pointer">
                <div className={`relative aspect-[4/3] overflow-hidden rounded-xl border ${BORDER_SOFT}`}>
                  {p.cover_image_url ? (
                    <Image src={p.cover_image_url} alt={p.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0B0E14] via-[#1a1d29] to-indigo-950" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <p className="absolute left-4 right-4 bottom-4 text-lg font-semibold tracking-tight leading-snug text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">{p.title}</p>
                </div>
                <div className="mt-4">
                  {p.excerpt && <p className={`text-sm leading-relaxed line-clamp-2 ${TEXT_SECONDARY}`}>{p.excerpt}</p>}
                  <p className={`mt-3 text-xs ${TEXT_FAINT}`}>{formatDate(p.published_at)} · {estimateReadMinutes(p.content)} min read</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className={`border-t ${BORDER} py-10 px-6 sm:px-10`}>
        <div className="max-w-[1200px] mx-auto flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-6 w-6 rounded object-contain" />
          <span className={`text-xs ${TEXT_FAINT}`}>{GLOBAL_VISTA_BRANDING.poweredByLabel} · © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
