import { listBlogPostsForAdmin } from "@/lib/platform/actions/blog";
import BlogManager from "@/components/platform/BlogManager";

export default async function PlatformBlogPage() {
  const posts = await listBlogPostsForAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Blog</h1>
        <p className="text-muted-foreground text-sm">Posts published here appear on the public /blog pages and as a teaser on the homepage.</p>
      </div>
      <BlogManager posts={posts} />
    </div>
  );
}
