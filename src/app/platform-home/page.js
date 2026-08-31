import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { getSubscriptionDetails } from "@/lib/platform/tenant";
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
  const session = await getSession();
  const [plans, posts, offers, subscription] = await Promise.all([
    listPublicPlans(),
    listPublishedBlogPosts(3),
    listActiveOffers(),
    session ? getSubscriptionDetails(session.company_id) : null,
  ]);
  // Pricing CTAs need to know who's actually looking at the page — a
  // logged-out visitor gets sent to log in first, a logged-in company
  // owner gets sent straight to checkout (or "Upgrade" if they already
  // have a paid plan), and a logged-in employee who isn't the Super Admin
  // can't act on billing at all (see SubscriptionManager's own gate) — the
  // pricing cards need to say so rather than link to a page that'll just
  // reject them.
  const viewer = session
    ? { loggedIn: true, isSuperAdmin: isSuperAdmin(session), currentPlanId: subscription?.planId || null, currentPlanState: subscription?.state || null }
    : { loggedIn: false, isSuperAdmin: false, currentPlanId: null, currentPlanState: null };
  return <PlatformHome plans={plans} posts={posts} offers={offers} viewer={viewer} />;
}
