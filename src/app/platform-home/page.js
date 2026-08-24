import { listPublicPlans } from "@/lib/platform/actions/registration";
import { listPublishedBlogPosts } from "@/lib/platform/actions/blog";
import { listActiveOffers } from "@/lib/platform/actions/offers";
import PlatformHome from "@/components/platformHome/PlatformHome";

export const metadata = { title: "KaizenBMS Platform — One Platform. Complete Business Control." };
// Pricing must reflect live plan data (Part 7 spec: "pull dynamically from
// the plan system"), not a build-time snapshot — a Platform Operator
// editing a plan should show up here without a rebuild. Same reasoning now
// applies to the blog teaser and offers strip — both Platform-Operator-managed.
export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const [plans, posts, offers] = await Promise.all([
    listPublicPlans(),
    listPublishedBlogPosts(3),
    listActiveOffers(),
  ]);
  return <PlatformHome plans={plans} posts={posts} offers={offers} />;
}
