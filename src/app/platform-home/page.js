import { listPublicPlans } from "@/lib/platform/actions/registration";
import PlatformHome from "@/components/platformHome/PlatformHome";

export const metadata = { title: "KaizenBMS Platform — One Platform. Complete Business Control." };
// Pricing must reflect live plan data (Part 7 spec: "pull dynamically from
// the plan system"), not a build-time snapshot — a Platform Operator
// editing a plan should show up here without a rebuild.
export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const plans = await listPublicPlans();
  return <PlatformHome plans={plans} />;
}
