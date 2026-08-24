import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedBlogPostBySlug, estimateReadMinutes } from "@/lib/platform/actions/blog";
import PlatformHomeNavbar from "@/components/platformHome/PlatformHomeNavbar";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import { PAGE_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_FAINT, BORDER } from "@/components/platformHome/editorialTheme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  return { title: post ? `${post.title} — KaizenBMS Platform` : "Post not found" };
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return notFound();

  return (
    <div className={`${PAGE_BG} ${TEXT_PRIMARY} min-h-screen overflow-x-hidden antialiased`}>
      <PlatformHomeNavbar />

      <article className="pt-24 sm:pt-28 pb-24">
        <div className="max-w-[900px] mx-auto px-6 sm:px-10">
          <Link href="/blog" className={`inline-flex items-center gap-1.5 text-xs ${TEXT_SECONDARY} hover:text-[#0B0E14] dark:hover:text-[#F4F3EF] transition-colors cursor-pointer`}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
          </Link>
        </div>

        <div className={`relative mt-6 max-w-[900px] mx-auto sm:px-6 md:px-10 aspect-[16/9] sm:aspect-[21/9] overflow-hidden sm:rounded-xl border-y sm:border ${BORDER}`}>
          {post.cover_image_url ? (
            <Image src={post.cover_image_url} alt={post.title} fill sizes="900px" className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B0E14] via-[#1a1d29] to-indigo-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute left-6 right-6 sm:left-10 sm:right-10 bottom-6 sm:bottom-8">
            <p className="text-xs text-white/70">{formatDate(post.published_at)} · {estimateReadMinutes(post.content)} min read</p>
            <h1 className="mt-2 text-2xl sm:text-4xl font-semibold tracking-tight leading-[1.1] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.4)]">{post.title}</h1>
          </div>
        </div>

        <div className={`mt-10 max-w-[760px] mx-auto px-6 sm:px-10 text-[15px] leading-relaxed whitespace-pre-wrap ${TEXT_SECONDARY}`}>
          {post.content}
        </div>
      </article>

      <footer className={`border-t ${BORDER} py-10 px-6 sm:px-10`}>
        <div className="max-w-[760px] mx-auto flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GLOBAL_VISTA_BRANDING.logoUrl} alt={GLOBAL_VISTA_BRANDING.name} className="h-6 w-6 rounded object-contain" />
          <span className={`text-xs ${TEXT_FAINT}`}>{GLOBAL_VISTA_BRANDING.poweredByLabel} · © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
